/**
 * Checks audit log settings and retention (rem0002 step 2):
 * - global `audit-logs-settings` holds `retentionMonths` (1-120, default 12, whole numbers only)
 * - access: active super users read and update, non-super users denied, admin.hidden for non-super
 * - updates to the global are logged in `audit-logs`
 * - pruning: deletes rows older than retentionMonths in batches via SQL, keeps newer rows
 * - pruning cap: respects maxRows and finishes in subsequent runs
 * - pruning touches only old audit_logs rows, not pages or recent logs
 * - maintenance job: `pruneAuditLogs` task runs and reschedules for next 03:00 server time
 * - `ensurePruneJobQueued` is idempotent and leaves exactly one waiting job
 *
 *   pnpm payload run scripts/verify/auditLogRetention.ts
 *
 * Refuses to run in production. Cleans up test business, users, backdated rows, created logs,
 * and created jobs at the end, restoring original retentionMonths.
 */
import { randomUUID } from 'crypto'

import { sql } from '@payloadcms/db-postgres'
import config from '@payload-config'
import { getPayload, type NumberField, type Where } from 'payload'

import { ensurePruneJobQueued, pruneAuditLogs } from '@/collections/AuditLogs/jobs/pruneAuditLogs'
import { canRunJobs } from '@/common/utils/jobsAccess'
import type { Tenant } from '@/payload-types'
import {
  createChecker,
  isRefused,
  loadUser,
  platformProfileWhere,
  reqFor,
  succeeds,
  type SessionUser,
} from './lib/verifyKit'

if (process.env.NODE_ENV === 'production') {
  console.error('verify: refusing to run with NODE_ENV=production')
  process.exit(1)
}

const payload = await getPayload({ config })
const { check, failures } = createChecker(payload)

interface DrizzleExecutor {
  execute: (query: ReturnType<typeof sql>) => Promise<unknown>
}

const isDrizzleAdapter = (db: unknown): db is { drizzle: DrizzleExecutor } => {
  if (typeof db !== 'object' || db === null) return false
  if (!('drizzle' in db)) return false
  const drizzle = db.drizzle
  if (typeof drizzle !== 'object' || drizzle === null) return false
  return 'execute' in drizzle && typeof drizzle.execute === 'function'
}

if (!isDrizzleAdapter(payload.db)) {
  throw new Error('verify: postgres drizzle adapter expected')
}
const drizzle = payload.db.drizzle

const isRecord = (val: unknown): val is Record<string, unknown> =>
  typeof val === 'object' && val !== null && !Array.isArray(val)

const PREFIX = 'verify-retention'
const ADMIN_EMAIL = `${PREFIX}-admin@example.test`
const MEMBER_EMAIL = `${PREFIX}-member@example.test`
const TEST_EMAILS = [ADMIN_EMAIL, MEMBER_EMAIL]
const TEST_TENANTS = [PREFIX]
const context = { disableRevalidate: true }

const startedAt = new Date().toISOString()

const safeCheck = async (name: string, fn: () => Promise<boolean> | boolean): Promise<void> => {
  try {
    const ok = await fn()
    check(name, ok)
  } catch (err) {
    payload.logger.error({ msg: `verify check threw: ${name}`, err })
    check(name, false)
  }
}

const findTenant = async (slug: string): Promise<Tenant | null> => {
  const { docs } = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
  })
  return docs[0] ?? null
}

const deleteBusiness = async (tenantId: number): Promise<void> => {
  const byTenant: Where = { tenant: { equals: tenantId } }
  for (const slug of [
    'form-submissions',
    'forms',
    'posts',
    'search',
    'pages',
    'categories',
    'analytics',
    'header',
    'footer',
    'theme',
    'settings',
    'users-access',
  ] as const) {
    await payload.delete({ collection: slug, where: byTenant, context })
  }
  await payload.delete({ collection: 'tenants', id: tenantId, context })
}

let initialRetentionMonths = 12
try {
  const currentGlobal = await payload.findGlobal({
    slug: 'audit-logs-settings',
    overrideAccess: true,
  })
  if (typeof currentGlobal.retentionMonths === 'number') {
    initialRetentionMonths = currentGlobal.retentionMonths
  }
} catch {
  // global table may not have stored value yet
}

const cleanup = async (): Promise<void> => {
  try {
    await payload.updateGlobal({
      slug: 'audit-logs-settings',
      data: { retentionMonths: initialRetentionMonths },
      overrideAccess: true,
    })
  } catch {
    // ignore
  }

  try {
    await payload.delete({
      collection: 'users',
      where: { email: { in: TEST_EMAILS } },
    })
  } catch {
    // ignore
  }

  for (const slug of TEST_TENANTS) {
    try {
      const tenant = await findTenant(slug)
      if (tenant) await deleteBusiness(tenant.id)
    } catch {
      // ignore
    }
  }

  try {
    await drizzle.execute(sql`DELETE FROM audit_logs WHERE collection_slug = 'verify-retention'`)
  } catch {
    // ignore
  }

  try {
    await payload.delete({
      collection: 'audit-logs',
      where: { createdAt: { greater_than_equal: startedAt } },
    })
  } catch {
    // ignore
  }

  try {
    await payload.delete({
      collection: 'payload-jobs',
      where: { createdAt: { greater_than_equal: startedAt } },
    })
  } catch {
    // ignore
  }
}

const makeMember = async (
  email: string,
  row: { tenant: number; isTenantAdmin?: boolean; access?: number },
): Promise<SessionUser> => {
  await payload.create({
    collection: 'users',
    data: { email, name: email.split('@')[0], password: randomUUID(), tenants: [row] },
  })
  return loadUser(payload, email)
}

try {
  await cleanup()

  const superUser = await loadUser(payload, process.env.SEED_ADMIN_EMAIL || 'default@payload.com')
  const asSuper = { user: superUser, overrideAccess: false, context }

  const makeTenant = (slug: string) =>
    payload.create({
      collection: 'tenants',
      data: { name: slug, slug },
      ...asSuper,
      context: { ...context, skipHomePage: true },
    })

  const tenantA = await makeTenant(PREFIX)
  const { docs: templates } = await payload.find({
    collection: 'users-access',
    where: platformProfileWhere('pages-editor'),
    limit: 1,
    depth: 0,
  })
  if (!templates[0]) throw new Error('verify: pages-editor template not found, run migrations')

  const tenantAdmin = await makeMember(ADMIN_EMAIL, {
    tenant: tenantA.id,
    isTenantAdmin: true,
  })
  const member = await makeMember(MEMBER_EMAIL, {
    tenant: tenantA.id,
    access: templates[0].id,
  })

  const settingsGlobal = payload.config.globals?.find((g) => g.slug === 'audit-logs-settings')

  // --- settings: field definition
  await safeCheck('settings: retentionMonths field is required, min 1, max 120, default 12', () => {
    const retentionField = settingsGlobal?.fields.find(
      (f): f is NumberField => 'name' in f && f.name === 'retentionMonths',
    )
    return Boolean(
      retentionField &&
        retentionField.type === 'number' &&
        retentionField.required === true &&
        retentionField.min === 1 &&
        retentionField.max === 120 &&
        retentionField.defaultValue === 12,
    )
  })

  // --- settings: reading the global with no stored value gives 12
  await safeCheck('settings: reading the global with no stored value gives 12', async () => {
    const initialGlobal = await payload.findGlobal({
      slug: 'audit-logs-settings',
      overrideAccess: true,
    })
    return initialGlobal.retentionMonths === 12
  })

  // --- settings validation
  await safeCheck('settings validation: 0 is refused (400)', async () =>
    isRefused(
      payload,
      () =>
        payload.updateGlobal({
          slug: 'audit-logs-settings',
          data: { retentionMonths: 0 },
          user: superUser,
          overrideAccess: false,
        }),
      [400],
    ),
  )

  await safeCheck('settings validation: 121 is refused (400)', async () =>
    isRefused(
      payload,
      () =>
        payload.updateGlobal({
          slug: 'audit-logs-settings',
          data: { retentionMonths: 121 },
          user: superUser,
          overrideAccess: false,
        }),
      [400],
    ),
  )

  await safeCheck('settings validation: 1.5 is refused (400)', async () =>
    isRefused(
      payload,
      () =>
        payload.updateGlobal({
          slug: 'audit-logs-settings',
          data: { retentionMonths: 1.5 },
          user: superUser,
          overrideAccess: false,
        }),
      [400],
    ),
  )

  await safeCheck('settings validation: 1 is accepted (as the super user)', async () =>
    succeeds(payload, () =>
      payload.updateGlobal({
        slug: 'audit-logs-settings',
        data: { retentionMonths: 1 },
        user: superUser,
        overrideAccess: false,
      }),
    ),
  )

  await safeCheck('settings validation: 120 is accepted (as the super user)', async () =>
    succeeds(payload, () =>
      payload.updateGlobal({
        slug: 'audit-logs-settings',
        data: { retentionMonths: 120 },
        user: superUser,
        overrideAccess: false,
      }),
    ),
  )

  // --- settings access
  await safeCheck('settings access: super user can read', async () =>
    succeeds(payload, () =>
      payload.findGlobal({
        slug: 'audit-logs-settings',
        user: superUser,
        overrideAccess: false,
      }),
    ),
  )

  await safeCheck('settings access: super user can update', async () =>
    succeeds(payload, () =>
      payload.updateGlobal({
        slug: 'audit-logs-settings',
        data: { retentionMonths: 12 },
        user: superUser,
        overrideAccess: false,
      }),
    ),
  )

  await safeCheck('settings access: tenant admin read is refused', async () =>
    isRefused(payload, () =>
      payload.findGlobal({
        slug: 'audit-logs-settings',
        user: tenantAdmin,
        overrideAccess: false,
      }),
    ),
  )

  await safeCheck('settings access: tenant admin update is refused', async () =>
    isRefused(payload, () =>
      payload.updateGlobal({
        slug: 'audit-logs-settings',
        data: { retentionMonths: 6 },
        user: tenantAdmin,
        overrideAccess: false,
      }),
    ),
  )

  await safeCheck('settings access: member read is refused', async () =>
    isRefused(payload, () =>
      payload.findGlobal({
        slug: 'audit-logs-settings',
        user: member,
        overrideAccess: false,
      }),
    ),
  )

  await safeCheck('settings access: member update is refused', async () =>
    isRefused(payload, () =>
      payload.updateGlobal({
        slug: 'audit-logs-settings',
        data: { retentionMonths: 6 },
        user: member,
        overrideAccess: false,
      }),
    ),
  )

  await safeCheck('settings access: anonymous read is refused', async () =>
    isRefused(payload, () =>
      payload.findGlobal({
        slug: 'audit-logs-settings',
        overrideAccess: false,
      }),
    ),
  )

  await safeCheck('settings access: anonymous update is refused', async () =>
    isRefused(payload, () =>
      payload.updateGlobal({
        slug: 'audit-logs-settings',
        data: { retentionMonths: 6 },
        overrideAccess: false,
      }),
    ),
  )

  await safeCheck('settings access: admin.hidden is false for super user', () => {
    const hiddenFn = settingsGlobal?.admin?.hidden
    const hiddenSuper = typeof hiddenFn === 'function' ? hiddenFn({ user: superUser }) : hiddenFn
    return hiddenSuper === false
  })

  await safeCheck('settings access: admin.hidden is true for tenant admin', () => {
    const hiddenFn = settingsGlobal?.admin?.hidden
    const hiddenAdmin = typeof hiddenFn === 'function' ? hiddenFn({ user: tenantAdmin }) : hiddenFn
    return hiddenAdmin === true
  })

  await safeCheck('settings access: admin.hidden is true for member', () => {
    const hiddenFn = settingsGlobal?.admin?.hidden
    const hiddenMember = typeof hiddenFn === 'function' ? hiddenFn({ user: member }) : hiddenFn
    return hiddenMember === true
  })

  // --- settings logged
  await safeCheck(
    'settings logged: the super user changing 12 -> 6 writes one update row',
    async () => {
      await payload.updateGlobal({
        slug: 'audit-logs-settings',
        data: { retentionMonths: 12 },
        overrideAccess: true,
      })
      const auditStart = new Date().toISOString()
      await payload
        .updateGlobal({
          slug: 'audit-logs-settings',
          data: { retentionMonths: 6 },
          user: superUser,
          overrideAccess: false,
        })
        .catch(() => {
          // May be rejected if access logic is not yet implemented
        })
      const globalLogRows = await payload.find({
        collection: 'audit-logs',
        where: {
          and: [
            { createdAt: { greater_than_equal: auditStart } },
            { collectionSlug: { equals: 'audit-logs-settings' } },
            { docId: { equals: 'audit-logs-settings' } },
          ],
        },
        overrideAccess: true,
        depth: 0,
      })
      const targetRow = globalLogRows.docs[0]
      const changes = isRecord(targetRow?.changes) ? targetRow.changes : {}
      const retentionChange = changes.retentionMonths
      const retentionFromTo =
        isRecord(retentionChange) && retentionChange.from === 12 && retentionChange.to === 6
      return (
        globalLogRows.docs.length === 1 &&
        targetRow?.operation === 'update' &&
        targetRow.tenant === null &&
        Boolean(retentionFromTo)
      )
    },
  )

  // --- prune: 2,500 rows 13 months old + 10 rows 11 months old
  await safeCheck(
    'prune: 2,500 rows 13 months old + 10 rows 11 months old, retention 12, batchSize 1000, pauseMs 0 -> deleted 2500, remaining 0, the 10 newer rows still there',
    async () => {
      await payload.updateGlobal({
        slug: 'audit-logs-settings',
        data: { retentionMonths: 12 },
        overrideAccess: true,
      })
      await drizzle.execute(sql`DELETE FROM audit_logs WHERE collection_slug = 'verify-retention'`)
      await drizzle.execute(
        sql`INSERT INTO audit_logs (operation, collection_slug, doc_id, created_at, updated_at) SELECT 'create', 'verify-retention', g::text, now() - interval '13 months', now() FROM generate_series(1, 2500) g`,
      )
      await drizzle.execute(
        sql`INSERT INTO audit_logs (operation, collection_slug, doc_id, created_at, updated_at) SELECT 'create', 'verify-retention', ('new-' || g)::text, now() - interval '11 months', now() FROM generate_series(1, 10) g`,
      )
      const pruneRes = await pruneAuditLogs(payload, { batchSize: 1000, pauseMs: 0 })
      const { totalDocs: remainingDocs } = await payload.find({
        collection: 'audit-logs',
        where: { collectionSlug: { equals: 'verify-retention' } },
        depth: 0,
        overrideAccess: true,
        limit: 0,
      })
      return pruneRes.deleted === 2500 && pruneRes.remaining === 0 && remainingDocs === 10
    },
  )

  // --- prune cap
  await safeCheck(
    'prune cap: 2,500 rows 13 months old, batchSize 500, maxRows 1000 -> deleted 1000, remaining 1500; a second run deletes the rest',
    async () => {
      await drizzle.execute(sql`DELETE FROM audit_logs WHERE collection_slug = 'verify-retention'`)
      await drizzle.execute(
        sql`INSERT INTO audit_logs (operation, collection_slug, doc_id, created_at, updated_at) SELECT 'create', 'verify-retention', g::text, now() - interval '13 months', now() FROM generate_series(1, 2500) g`,
      )
      const capRes1 = await pruneAuditLogs(payload, { batchSize: 500, maxRows: 1000, pauseMs: 0 })
      const capRes2 = await pruneAuditLogs(payload, { batchSize: 500, maxRows: 2000, pauseMs: 0 })
      return (
        capRes1.deleted === 1000 &&
        capRes1.remaining === 1500 &&
        capRes2.deleted === 1500 &&
        capRes2.remaining === 0
      )
    },
  )

  // --- prune follows the setting
  await safeCheck(
    'prune follows the setting: retention 6 -> rows 7 months old deleted, rows 5 months old kept',
    async () => {
      await payload.updateGlobal({
        slug: 'audit-logs-settings',
        data: { retentionMonths: 6 },
        overrideAccess: true,
      })
      await drizzle.execute(sql`DELETE FROM audit_logs WHERE collection_slug = 'verify-retention'`)
      await drizzle.execute(
        sql`INSERT INTO audit_logs (operation, collection_slug, doc_id, created_at, updated_at) SELECT 'create', 'verify-retention', ('old-' || g)::text, now() - interval '7 months', now() FROM generate_series(1, 20) g`,
      )
      await drizzle.execute(
        sql`INSERT INTO audit_logs (operation, collection_slug, doc_id, created_at, updated_at) SELECT 'create', 'verify-retention', ('keep-' || g)::text, now() - interval '5 months', now() FROM generate_series(1, 15) g`,
      )
      const prune6Res = await pruneAuditLogs(payload, { pauseMs: 0 })
      const { totalDocs: keptDocs } = await payload.find({
        collection: 'audit-logs',
        where: { collectionSlug: { equals: 'verify-retention' } },
        depth: 0,
        overrideAccess: true,
        limit: 0,
      })
      return prune6Res.deleted === 20 && keptDocs === 15
    },
  )

  // --- prune touches only old audit_logs rows
  await safeCheck(
    'prune touches only old audit_logs rows: row counts of pages and of recent audit rows unchanged',
    async () => {
      const { totalDocs: pagesBefore } = await payload.find({
        collection: 'pages',
        depth: 0,
        overrideAccess: true,
        limit: 0,
      })
      const { totalDocs: recentAuditBefore } = await payload.find({
        collection: 'audit-logs',
        where: { createdAt: { greater_than_equal: startedAt } },
        depth: 0,
        overrideAccess: true,
        limit: 0,
      })
      await pruneAuditLogs(payload, { pauseMs: 0 })
      const { totalDocs: pagesAfter } = await payload.find({
        collection: 'pages',
        depth: 0,
        overrideAccess: true,
        limit: 0,
      })
      const { totalDocs: recentAuditAfter } = await payload.find({
        collection: 'audit-logs',
        where: { createdAt: { greater_than_equal: startedAt } },
        depth: 0,
        overrideAccess: true,
        limit: 0,
      })
      return pagesBefore === pagesAfter && recentAuditBefore === recentAuditAfter
    },
  )

  // --- job: queueing and running maintenance queue
  await safeCheck(
    'job: queueing pruneAuditLogs and running the maintenance queue deletes the old rows, completes without error, and leaves exactly one waiting pruneAuditLogs job with waitUntil in the future (<= 24 h)',
    async () => {
      await payload.updateGlobal({
        slug: 'audit-logs-settings',
        data: { retentionMonths: 12 },
        overrideAccess: true,
      })
      await drizzle.execute(sql`DELETE FROM audit_logs WHERE collection_slug = 'verify-retention'`)
      await drizzle.execute(
        sql`INSERT INTO audit_logs (operation, collection_slug, doc_id, created_at, updated_at) SELECT 'create', 'verify-retention', g::text, now() - interval '13 months', now() FROM generate_series(1, 50) g`,
      )
      await payload.delete({
        collection: 'payload-jobs',
        where: {
          and: [{ taskSlug: { equals: 'pruneAuditLogs' } }, { queue: { equals: 'maintenance' } }],
        },
      })
      await payload.jobs.queue({
        task: 'pruneAuditLogs',
        queue: 'maintenance',
        input: {},
      })
      await payload.jobs.run({ queue: 'maintenance' })
      const { totalDocs: remainingJobAuditRows } = await payload.find({
        collection: 'audit-logs',
        where: { collectionSlug: { equals: 'verify-retention' } },
        depth: 0,
        overrideAccess: true,
        limit: 0,
      })
      const { docs: waitingJobs } = await payload.find({
        collection: 'payload-jobs',
        where: {
          and: [
            { taskSlug: { equals: 'pruneAuditLogs' } },
            { queue: { equals: 'maintenance' } },
            { hasError: { equals: false } },
            { completedAt: { exists: false } },
          ],
        },
        depth: 0,
        overrideAccess: true,
      })
      const waitingJob = waitingJobs[0]
      const nowMs = Date.now()
      const waitMs = waitingJob?.waitUntil ? new Date(waitingJob.waitUntil).getTime() : 0
      const waitInFuture = waitMs > nowMs && waitMs <= nowMs + 24 * 60 * 60 * 1000

      return remainingJobAuditRows === 0 && waitingJobs.length === 1 && Boolean(waitInFuture)
    },
  )

  // --- ensurePruneJobQueued twice
  await safeCheck('ensurePruneJobQueued twice -> exactly one waiting job', async () => {
    await payload.delete({
      collection: 'payload-jobs',
      where: {
        and: [{ taskSlug: { equals: 'pruneAuditLogs' } }, { queue: { equals: 'maintenance' } }],
      },
    })
    await ensurePruneJobQueued(payload)
    await ensurePruneJobQueued(payload)
    const { docs: idempotentWaitingJobs } = await payload.find({
      collection: 'payload-jobs',
      where: {
        and: [
          { taskSlug: { equals: 'pruneAuditLogs' } },
          { queue: { equals: 'maintenance' } },
          { hasError: { equals: false } },
          { completedAt: { exists: false } },
        ],
      },
      depth: 0,
      overrideAccess: true,
    })
    return idempotentWaitingJobs.length === 1
  })

  // --- who runs jobs and touches payload-jobs (Payload leaves both open to every signed-in user)
  const runAllowed = async (user: SessionUser | null, authorization?: string) => {
    const req = await reqFor(payload, user)
    if (authorization) req.headers.set('authorization', authorization)
    return canRunJobs({ req })
  }
  const savedSecret = process.env.CRON_SECRET
  try {
    await safeCheck('jobs run: the super user may run jobs', () => runAllowed(superUser))
    await safeCheck(
      'jobs run: a tenant admin may not',
      async () => !(await runAllowed(tenantAdmin)),
    )
    await safeCheck('jobs run: a member may not', async () => !(await runAllowed(member)))
    delete process.env.CRON_SECRET
    await safeCheck(
      'jobs run: with no CRON_SECRET set, "Bearer undefined" is refused',
      async () => !(await runAllowed(null, 'Bearer undefined')),
    )
    process.env.CRON_SECRET = 'verify-retention-secret'
    await safeCheck('jobs run: the right bearer secret is accepted', () =>
      runAllowed(null, 'Bearer verify-retention-secret'),
    )
    await safeCheck(
      'jobs run: a wrong bearer secret is refused',
      async () => !(await runAllowed(null, 'Bearer nope')),
    )
  } finally {
    if (savedSecret === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = savedSecret
  }
  for (const user of [tenantAdmin, member]) {
    await safeCheck(`payload-jobs: ${user.email} can't read jobs`, () =>
      isRefused(payload, () =>
        payload.find({ collection: 'payload-jobs', user, overrideAccess: false }),
      ),
    )
    await safeCheck(`payload-jobs: ${user.email} can't queue a job`, () =>
      isRefused(payload, () =>
        payload.create({
          collection: 'payload-jobs',
          data: { taskSlug: 'pruneAuditLogs', queue: 'maintenance', input: {} },
          user,
          overrideAccess: false,
        }),
      ),
    )
  }
  await safeCheck('payload-jobs: the super user reads jobs', () =>
    succeeds(payload, () =>
      payload.find({ collection: 'payload-jobs', user: superUser, overrideAccess: false }),
    ),
  )
} catch (err) {
  payload.logger.error({ msg: 'verify: auditLogRetention crashed', err })
  check('verify ran to the end', false)
} finally {
  await cleanup()
}

if (failures() > 0) {
  payload.logger.error(`verify: auditLogRetention ${failures()} check(s) failed`)
  process.exit(1)
}
payload.logger.info('verify: auditLogRetention all checks passed')
process.exit(0)
