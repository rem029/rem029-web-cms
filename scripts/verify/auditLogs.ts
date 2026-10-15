/**
 * Checks audit logs (rem0002): every collection is either in `auditedCollections` (gets the
 * `auditLogAfterChange` / `auditLogAfterDelete` hooks from the `addAuditLog` plugin) or in
 * `notAudited` (gets neither); creates, updates and deletes write one row each with the user,
 * collection, doc id, tenant and the changes (changed fields only, from → to; big fields as
 * "changed"; secrets never); draft saves write nothing; tenant admins read their businesses' rows
 * only, super users all, nobody writes them; a log that fails in the database never fails the save.
 *
 *   pnpm payload run scripts/verify/auditLogs.ts
 *   or: pnpm verify
 *
 * Local API with `overrideAccess: false`. Creates businesses `verify-audit` and `verify-audit-2`,
 * a tenant admin for each (`verify-audit-admin@`, `verify-audit-2-admin@`), a member with the
 * `pages-editor` template (`verify-audit-member@`), pages, categories, a form and a post in them,
 * and removes them all at the end, with every `audit-logs` row written while it ran. Refuses to run
 * in production.
 */
import { randomUUID } from 'crypto'

import config from '@payload-config'
import {
  commitTransaction,
  getPayload,
  initTransaction,
  killTransaction,
  type CollectionSlug,
  type Where,
} from 'payload'

import { auditLogAfterChange, auditLogAfterDelete } from '@/common/hooks/auditLog'
import { auditedCollections, notAudited } from '@/common/utils/auditedCollections'
import { redact, writeAuditLog } from '@/common/utils/auditLog'
import { extractTenantId as relationId } from '@/common/utils/tenantCollections'
import type { AuditLog, Page, Tenant } from '@/payload-types'
import { contentLayout, richText } from '@/seeds/multiTenancy'
import {
  createChecker,
  isRefused,
  loadUser,
  platformProfileWhere,
  reqFor,
  statusOf,
  succeeds,
  type SessionUser,
} from './lib/verifyKit'

if (process.env.NODE_ENV === 'production') {
  console.error('verify: refusing to run with NODE_ENV=production')
  process.exit(1)
}

const payload = await getPayload({ config })
const { check, failures } = createChecker(payload)

const PREFIX = 'verify-audit'
const PREFIX_2 = 'verify-audit-2'
const PREFIX_3 = 'verify-audit-3'
const ADMIN_EMAIL = `${PREFIX}-admin@example.test`
const ADMIN_2_EMAIL = `${PREFIX_2}-admin@example.test`
const MEMBER_EMAIL = `${PREFIX}-member@example.test`
const READER_EMAIL = `${PREFIX}-reader@example.test`
const TEST_EMAILS = [ADMIN_EMAIL, ADMIN_2_EMAIL, MEMBER_EMAIL, READER_EMAIL]
const TEST_TENANTS = [PREFIX, PREFIX_2, PREFIX_3]
const context = { disableRevalidate: true }

// the collections whose changes must be logged (rem0002 requirement), independent of the config
// list, so a collection missing from auditedCollections fails here
const AUDITED: CollectionSlug[] = [
  'pages',
  'posts',
  'media',
  'header',
  'footer',
  'theme',
  'settings',
  'tenants',
  'users-access',
  'categories',
  'forms',
  'redirects',
  'users',
]
// keys that must never appear in a row
const SECRET_KEYS = ['password', 'hash', 'salt', 'resetPasswordToken', 'sessions', 'loginAttempts']

// every row the script causes is written after this, and removed at the end
const startedAt = new Date().toISOString()

const isRecord = (val: unknown): val is Record<string, unknown> =>
  typeof val === 'object' && val !== null && !Array.isArray(val)

const changesOf = (row: AuditLog | undefined): Record<string, unknown> =>
  isRecord(row?.changes) ? row.changes : {}

// a { from, to } change, compared by value: Postgres jsonb reorders the keys
const isChange = (value: unknown, from: unknown, to: unknown): boolean =>
  isRecord(value) && value.from === from && value.to === to

// every key at any depth of a value
const keysOf = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.flatMap(keysOf)
  if (!isRecord(value)) return []
  return Object.entries(value).flatMap(([key, val]) => [key, ...keysOf(val)])
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

// the rows written since the script started, oldest first (overrideAccess: what's stored)
const rowsWhere = async (where: Where): Promise<AuditLog[]> => {
  const { docs } = await payload.find({
    collection: 'audit-logs',
    where: { and: [{ createdAt: { greater_than_equal: startedAt } }, where] },
    sort: 'createdAt',
    pagination: false,
    depth: 0,
  })
  return docs
}
const rowsFor = (slug: CollectionSlug, id: number | string): Promise<AuditLog[]> =>
  rowsWhere({ and: [{ collectionSlug: { equals: slug } }, { docId: { equals: String(id) } }] })

// a business and everything in it; cleanupAfterTenantDelete is off, so its docs go first
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

const cleanup = async (): Promise<void> => {
  await payload.delete({ collection: 'users', where: { email: { in: TEST_EMAILS } } })
  for (const slug of TEST_TENANTS) {
    const tenant = await findTenant(slug)
    if (tenant) await deleteBusiness(tenant.id)
  }
  // last: the deletes above write rows too
  await payload.delete({
    collection: 'audit-logs',
    where: { createdAt: { greater_than_equal: startedAt } },
  })
}

// a tenant admin or member of a test business; the password is random and never printed
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

const pageData = (name: string, tenantId: number) => ({
  title: name,
  slug: `${PREFIX}-${name}`,
  tenant: tenantId,
  _status: 'published' as const,
  hero: { main: { type: 'none' as const } },
  layout: contentLayout(richText(name)),
})

try {
  await cleanup()

  // --- coverage: every collection is in exactly one list, and has the hooks only if listed
  const slugs = payload.config.collections
    .map((collection) => collection.slug)
    .filter((slug) => !slug.startsWith('payload-'))
  for (const slug of [...auditedCollections, ...notAudited]) {
    check(`coverage: listed ${slug} is a collection`, slugs.includes(slug))
  }
  for (const slug of AUDITED) {
    check(`coverage: ${slug} is audited`, auditedCollections.includes(slug))
  }
  for (const collection of payload.config.collections) {
    const slug = collection.slug
    if (slug.startsWith('payload-')) continue
    const listed = auditedCollections.includes(slug)
    check(`coverage: ${slug} is in exactly one list`, listed !== notAudited.includes(slug))
    const hasChangeHook = (collection.hooks.afterChange ?? []).includes(auditLogAfterChange)
    const hasDeleteHook = (collection.hooks.afterDelete ?? []).includes(auditLogAfterDelete)
    if (listed) {
      check(`coverage: ${slug} has both audit hooks`, hasChangeHook && hasDeleteHook)
    } else {
      check(`coverage: ${slug} has no audit hook`, !hasChangeHook && !hasDeleteHook)
    }
  }

  // --- fixtures
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
  const tenantB = await makeTenant(PREFIX_2)
  const { docs: templates } = await payload.find({
    collection: 'users-access',
    where: platformProfileWhere('pages-editor'),
    limit: 1,
    depth: 0,
  })
  if (!templates[0]) throw new Error('verify: pages-editor template not found, run migrations')
  // a profile (made by the super user) ticking everything on audit-logs and nothing else: only
  // read and the nav may count
  const AUDIT_ROW_ALL = {
    slug: 'audit-logs' as const,
    hidden: false,
    read: true,
    create: true,
    update: true,
    delete: true,
    admin: true,
    access: true,
  }
  const makeLogReaderProfile = (tenantId: number, slug: string) =>
    payload.create({
      collection: 'users-access',
      data: {
        name: `${slug} log reader`,
        slug: `${slug}-log-reader`,
        tenant: tenantId,
        access: [AUDIT_ROW_ALL],
      },
      ...asSuper,
    })
  const readerProfile = await makeLogReaderProfile(tenantA.id, PREFIX)
  const readerProfileB = await makeLogReaderProfile(tenantB.id, PREFIX_2)
  // tenant admin A has no profile (no logs by default); tenant admin B has the log reader profile
  const adminA = await makeMember(ADMIN_EMAIL, { tenant: tenantA.id, isTenantAdmin: true })
  const adminB = await makeMember(ADMIN_2_EMAIL, {
    tenant: tenantB.id,
    isTenantAdmin: true,
    access: readerProfileB.id,
  })
  const member = await makeMember(MEMBER_EMAIL, { tenant: tenantA.id, access: templates[0].id })
  const reader = await makeMember(READER_EMAIL, { tenant: tenantA.id, access: readerProfile.id })
  const asAdminA = { user: adminA, overrideAccess: false, context }

  // the four from → to checks below compare by value (isChange), not JSON text: changed with the
  // user's okay, 2026-10-10
  // --- rows: create, update, no-change update, blocks, delete (as the tenant admin)
  const page = await payload.create({
    collection: 'pages',
    data: pageData('rows', tenantA.id),
    ...asAdminA,
  })
  const created = (await rowsFor('pages', page.id)).filter((row) => row.operation === 'create')
  const createdChanges = changesOf(created[0])
  check('create: one create row', created.length === 1)
  check(
    'create: the row has the user, collection, doc id and tenant',
    created[0]?.user === adminA.id &&
      created[0]?.collectionSlug === 'pages' &&
      created[0]?.docId === String(page.id) &&
      relationId(created[0]?.tenant) === tenantA.id,
  )
  check(
    'create: changes has the title, without id, timestamps, createdBy or updatedBy',
    createdChanges.title === 'rows' &&
      ['id', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy'].every(
        (key) => !(key in createdChanges),
      ),
  )

  await payload.update({
    collection: 'pages',
    id: page.id,
    data: { title: 'rows renamed' },
    ...asAdminA,
  })
  const updates = (await rowsFor('pages', page.id)).filter((row) => row.operation === 'update')
  check('update: one update row', updates.length === 1)
  check(
    'update: changes has only the title, from → to',
    Object.keys(changesOf(updates[0])).join() === 'title' &&
      isChange(changesOf(updates[0]).title, 'rows', 'rows renamed'),
  )

  await payload.update({
    collection: 'pages',
    id: page.id,
    data: { title: 'rows renamed' },
    ...asAdminA,
  })
  check('update: no row when nothing changed', (await rowsFor('pages', page.id)).length === 2)

  const MARKER = 'verify-audit-block-marker'
  await payload.update({
    collection: 'pages',
    id: page.id,
    data: { layout: contentLayout(richText(MARKER)) },
    ...asAdminA,
  })
  const blocksRow = (await rowsFor('pages', page.id)).at(-1)
  check(
    'blocks: layout shows as "changed", without the block values',
    changesOf(blocksRow).layout === 'changed' &&
      !JSON.stringify(blocksRow ?? null).includes(MARKER),
  )

  await payload.delete({ collection: 'pages', id: page.id, ...asAdminA })
  const deleted = (await rowsFor('pages', page.id)).filter((row) => row.operation === 'delete')
  check(
    'delete: one delete row with the page fields',
    deleted.length === 1 &&
      deleted[0]?.user === adminA.id &&
      changesOf(deleted[0]).title === 'rows renamed',
  )

  // --- drafts: draft saves and autosaves write nothing; publish and unpublish one row each
  const drafted = await payload.create({
    collection: 'pages',
    data: pageData('drafts', tenantA.id),
    ...asAdminA,
  })
  const draftRows = async () => (await rowsFor('pages', drafted.id)).length
  const afterCreate = await draftRows()
  await payload.update({
    collection: 'pages',
    id: drafted.id,
    data: { title: 'drafts manual', _status: 'draft' },
    draft: true,
    ...asAdminA,
  })
  await payload.update({
    collection: 'pages',
    id: drafted.id,
    data: { title: 'drafts autosaved', _status: 'draft' },
    draft: true,
    autosave: true,
    ...asAdminA,
  })
  check('drafts: draft save and autosave write no row', (await draftRows()) === afterCreate)
  await payload.update({
    collection: 'pages',
    id: drafted.id,
    data: { _status: 'published' },
    ...asAdminA,
  })
  const published = (await rowsFor('pages', drafted.id)).slice(afterCreate)
  check(
    'drafts: publishing writes one update row, title from the last published to the new one',
    published.length === 1 &&
      published[0]?.operation === 'update' &&
      isChange(changesOf(published[0]).title, 'drafts', 'drafts autosaved'),
  )
  await payload.update({
    collection: 'pages',
    id: drafted.id,
    data: { _status: 'draft' },
    ...asAdminA,
  })
  const unpublished = (await rowsFor('pages', drafted.id)).slice(afterCreate + 1)
  check(
    'drafts: unpublishing writes one update row with the status',
    unpublished.length === 1 && isChange(changesOf(unpublished[0])._status, 'published', 'draft'),
  )

  // --- bulk: one row per doc
  const bulk = [
    await payload.create({
      collection: 'pages',
      data: pageData('bulk-1', tenantA.id),
      ...asAdminA,
    }),
    await payload.create({
      collection: 'pages',
      data: pageData('bulk-2', tenantA.id),
      ...asAdminA,
    }),
  ]
  const bulkWhere: Where = { id: { in: bulk.map((doc) => doc.id) } }
  const bulkRows = async (operation: AuditLog['operation']) =>
    rowsWhere({
      and: [
        { collectionSlug: { equals: 'pages' } },
        { docId: { in: bulk.map((doc) => String(doc.id)) } },
        { operation: { equals: operation } },
      ],
    })
  await payload.update({
    collection: 'pages',
    where: bulkWhere,
    data: { title: 'bulk renamed' },
    ...asAdminA,
  })
  check('bulk: one update of 2 pages writes 2 rows', (await bulkRows('update')).length === 2)
  await payload.delete({ collection: 'pages', where: bulkWhere, ...asAdminA })
  check('bulk: one delete of 2 pages writes 2 rows', (await bulkRows('delete')).length === 2)

  // --- cascade: renaming a parent category. nested-docs (Payload 3.44) only resaves children of a
  // published parent, and categories have no drafts, so the child isn't resaved (its breadcrumbs go
  // stale: follow-up in the rem0002 plan). checks one row for the parent, none for the child, no loop
  // (changed with the user's okay, 2026-10-10)
  const parent = await payload.create({
    collection: 'categories',
    data: { title: `${PREFIX} parent`, tenant: tenantA.id },
    ...asAdminA,
  })
  const child = await payload.create({
    collection: 'categories',
    data: { title: `${PREFIX} child`, tenant: tenantA.id, parent: parent.id },
    ...asAdminA,
  })
  const categoryRows = async () => ({
    parent: (await rowsFor('categories', parent.id)).length,
    child: (await rowsFor('categories', child.id)).length,
  })
  const beforeRename = await categoryRows()
  await payload.update({
    collection: 'categories',
    id: parent.id,
    data: { title: `${PREFIX} parent renamed` },
    ...asAdminA,
  })
  const afterRename = await categoryRows()
  check(
    'cascade: renaming a parent category writes one row for it and none for its child',
    afterRename.parent === beforeRename.parent + 1 && afterRename.child === beforeRename.child,
  )

  // --- tenants and users
  await payload.update({
    collection: 'tenants',
    id: tenantA.id,
    data: { name: `${PREFIX} renamed` },
    ...asAdminA,
  })
  const renamed = (await rowsFor('tenants', tenantA.id)).at(-1)
  check(
    'tenants: a rename by the tenant admin is logged with that tenant',
    renamed?.operation === 'update' &&
      renamed.user === adminA.id &&
      relationId(renamed.tenant) === tenantA.id,
  )

  await payload.update({
    collection: 'users',
    id: member.id,
    data: { name: 'verify audit member renamed' },
    user: member,
    overrideAccess: false,
  })
  const nameRow = (await rowsFor('users', member.id)).at(-1)
  check(
    'users: a user renaming themselves is logged with no tenant',
    nameRow?.operation === 'update' &&
      nameRow.user === member.id &&
      relationId(nameRow.tenant) === null &&
      isChange(changesOf(nameRow).name, MEMBER_EMAIL.split('@')[0], 'verify audit member renamed'),
  )

  // --- redaction: a password change shows as "changed", nothing secret in the row
  const newPassword = randomUUID()
  await payload.update({
    collection: 'users',
    id: member.id,
    data: { password: newPassword },
    user: member,
    overrideAccess: false,
  })
  const passwordRow = (await rowsFor('users', member.id)).at(-1)
  const passwordChanges = changesOf(passwordRow)
  check(
    'redaction: a password change shows password: "changed"',
    passwordChanges.password === 'changed',
  )
  check(
    'redaction: no password value, hash, salt, token or sessions anywhere in the row',
    !JSON.stringify(passwordRow ?? null).includes(newPassword) &&
      keysOf(passwordChanges).every((key) => key === 'password' || !SECRET_KEYS.includes(key)),
  )
  check(
    'redaction: keys that look secret are dropped at any depth',
    JSON.stringify(
      redact({
        smtpPassword: 'x',
        nested: { apiToken: 'y', clientSecret: 'z', ok: 1 },
        list: [{ myApiKey: 'w', label: 'kept' }],
      }),
    ) === JSON.stringify({ nested: { ok: 1 }, list: [{ label: 'kept' }] }),
  )

  // --- no user: seeds, jobs and plugin cascades are logged with an empty user
  const noUserPage = await payload.create({
    collection: 'pages',
    data: pageData('no-user', tenantA.id),
    context,
  })
  const noUserRows = await rowsFor('pages', noUserPage.id)
  check(
    'no user: a write without a user is logged with an empty user',
    noUserRows.length === 1 && noUserRows[0]?.user == null,
  )

  // --- unaudited collections write nothing
  await payload.create({
    collection: 'analytics',
    data: {
      deviceType: 'desktop',
      pagePath: `/${PREFIX}`,
      eventType: 'page_view',
      timestamp: new Date().toISOString(),
      tenant: tenantA.id,
    },
  })
  const form = await payload.create({
    collection: 'forms',
    data: {
      title: PREFIX,
      tenant: tenantA.id,
      confirmationType: 'message',
      confirmationMessage: richText(PREFIX),
      fields: [],
    },
    ...asAdminA,
  })
  check(
    'unaudited: an anonymous form submission is accepted',
    await succeeds(payload, () =>
      payload.create({
        collection: 'form-submissions',
        data: { form: form.id, submissionData: [] },
        overrideAccess: false,
      }),
    ),
  )
  const post = await payload.create({
    collection: 'posts',
    data: {
      title: PREFIX,
      slug: PREFIX,
      tenant: tenantA.id,
      _status: 'published',
      content: richText(PREFIX),
    },
    ...asAdminA,
  })
  const { totalDocs: searchDocs } = await payload.count({
    collection: 'search',
    where: { 'doc.value': { equals: post.id } },
  })
  check('unaudited: the post was synced to search', searchDocs === 1)
  for (const slug of notAudited) {
    check(
      `unaudited: no ${slug} rows`,
      (await rowsWhere({ collectionSlug: { equals: slug } })).length === 0,
    )
  }

  // --- deleting a tenant: logged with no tenant (the row can't point at a deleted tenant)
  const tenantC = await makeTenant(PREFIX_3)
  await deleteBusiness(tenantC.id)
  const tenantDeleted = (await rowsFor('tenants', tenantC.id)).filter(
    (row) => row.operation === 'delete',
  )
  check(
    'tenants: deleting a business writes one delete row with no tenant',
    tenantDeleted.length === 1 && relationId(tenantDeleted[0]?.tenant) === null,
  )

  // --- read access
  check(
    "read: a tenant admin's profile counts only for audit-logs (B still creates pages without it)",
    await succeeds(payload, () =>
      payload.create({
        collection: 'pages',
        data: pageData('in-b', tenantB.id),
        user: adminB,
        overrideAccess: false,
        context,
      }),
    ),
  )
  const readAs = async (user: SessionUser | null): Promise<AuditLog[]> => {
    const { docs } = await payload.find({
      collection: 'audit-logs',
      where: { createdAt: { greater_than_equal: startedAt } },
      pagination: false,
      depth: 0,
      overrideAccess: false,
      ...(user ? { user } : {}),
    })
    return docs
  }
  // the tenants of the rows a reader gets; refused reads as none
  const tenantsSeenBy = async (user: SessionUser): Promise<(number | null)[]> => {
    try {
      return (await readAs(user)).map((row) => relationId(row.tenant))
    } catch (err) {
      if (statusOf(err) === 403) return []
      throw err
    }
  }
  check('read: anonymous is refused', await isRefused(payload, () => readAs(null)))
  check('read: a member (pages-editor) is refused', await isRefused(payload, () => readAs(member)))
  check(
    'read: a tenant admin without a profile allowing it is refused (no logs by default)',
    await isRefused(payload, () => readAs(adminA)),
  )
  const seenByReader = await tenantsSeenBy(reader)
  check(
    `read: a member whose profile allows audit-logs read sees only ${PREFIX}'s rows`,
    seenByReader.length > 0 && seenByReader.every((id) => id === tenantA.id),
  )
  const seenByB = await tenantsSeenBy(adminB)
  check(
    `read: ${PREFIX_2}'s tenant admin, whose profile allows it, sees only ${PREFIX_2}'s rows`,
    seenByB.length > 0 && seenByB.every((id) => id === tenantB.id),
  )
  const seenBySuper = await tenantsSeenBy(superUser)
  check(
    'read: the super user sees both businesses and the rows with no tenant',
    seenBySuper.includes(tenantA.id) &&
      seenBySuper.includes(tenantB.id) &&
      seenBySuper.includes(null),
  )

  // --- nav: shown to super users and to rows whose profile shows audit-logs
  const { hidden } = payload.collections['audit-logs'].config.admin
  const isHiddenFor = (user: SessionUser): boolean =>
    typeof hidden === 'function' ? hidden({ user }) : hidden === true
  check('nav: the super user sees Audit Logs', !isHiddenFor(superUser))
  check('nav: a tenant admin without a profile does not see Audit Logs', isHiddenFor(adminA))
  check('nav: a tenant admin whose profile shows audit-logs sees it', !isHiddenFor(adminB))
  check('nav: a member whose profile shows audit-logs sees it', !isHiddenFor(reader))
  check('nav: a member (pages-editor) does not see Audit Logs', isHiddenFor(member))

  // --- who grants it: only super users change a profile's audit-logs row
  const asAdminAProfiles = { user: adminA, overrideAccess: false }
  check(
    "grant: a tenant admin can't create a profile that reads audit-logs",
    await isRefused(
      payload,
      () =>
        payload.create({
          collection: 'users-access',
          data: {
            name: `${PREFIX} self grant`,
            slug: `${PREFIX}-self-grant`,
            tenant: tenantA.id,
            access: [{ ...AUDIT_ROW_ALL, create: false, update: false, delete: false }],
          },
          ...asAdminAProfiles,
        }),
      [400],
    ),
  )
  check(
    "grant: a tenant admin can't untick audit-logs read on a profile",
    await isRefused(
      payload,
      () =>
        payload.update({
          collection: 'users-access',
          id: readerProfile.id,
          data: { access: [{ ...AUDIT_ROW_ALL, read: false }] },
          ...asAdminAProfiles,
        }),
      [400],
    ),
  )
  check(
    'grant: a tenant admin still edits the rest of a profile with an audit-logs row',
    await succeeds(payload, () =>
      payload.update({
        collection: 'users-access',
        id: readerProfile.id,
        data: {
          name: `${PREFIX} log reader renamed`,
          access: [AUDIT_ROW_ALL, { slug: 'pages', hidden: false, read: true }],
        },
        ...asAdminAProfiles,
      }),
    ),
  )
  check(
    'grant: a tenant admin creates a profile without audit-logs access',
    await succeeds(payload, () =>
      payload.create({
        collection: 'users-access',
        data: {
          name: `${PREFIX} plain`,
          slug: `${PREFIX}-plain`,
          tenant: tenantA.id,
          access: [{ slug: 'pages', hidden: false, read: true }],
        },
        ...asAdminAProfiles,
      }),
    ),
  )

  // --- write access: nobody creates or updates rows through the api; only super users delete
  const rowData = {
    operation: 'create' as const,
    collectionSlug: 'pages',
    docId: 'verify-audit-forged',
  }
  // written directly (overrideAccess), so these checks don't depend on the hooks
  const target = await payload.create({
    collection: 'audit-logs',
    data: { ...rowData, tenant: tenantA.id },
  })
  for (const user of [member, reader, adminA, adminB, superUser]) {
    check(
      `write: ${user.email} can't create a row`,
      await isRefused(payload, () =>
        payload.create({ collection: 'audit-logs', data: rowData, user, overrideAccess: false }),
      ),
    )
    check(
      `write: ${user.email} can't update a row`,
      await isRefused(payload, () =>
        payload.update({
          collection: 'audit-logs',
          id: target.id,
          data: { docId: 'verify-audit-forged' },
          user,
          overrideAccess: false,
        }),
      ),
    )
  }
  for (const user of [reader, adminA, adminB]) {
    check(
      `write: ${user.email} can't delete a row`,
      await isRefused(payload, () =>
        payload.delete({ collection: 'audit-logs', id: target.id, user, overrideAccess: false }),
      ),
    )
  }
  check(
    'write: the super user deletes a row',
    await succeeds(payload, () =>
      payload.delete({
        collection: 'audit-logs',
        id: target.id,
        user: superUser,
        overrideAccess: false,
      }),
    ),
  )

  // --- a log that fails in the database never fails the save: a tenant id that doesn't exist is a
  // real foreign key error inside the transaction, which aborts it unless the log is in a savepoint
  // the errors logged while writeAuditLog runs (and only then)
  const errors: unknown[] = []
  const logError = payload.logger.error
  const req = await reqFor(payload, null)
  let failedLogReturned = false
  let pageCommitted: Page | null = null
  try {
    await initTransaction(req)
    payload.logger.error = new Proxy(logError, {
      apply: (fn, self, args) => {
        errors.push(args[0])
        return Reflect.apply(fn, self, args)
      },
    })
    try {
      await writeAuditLog(req, {
        operation: 'create',
        collectionSlug: 'pages',
        docId: 'verify-audit-bad',
        tenant: 2_000_000_000,
        user: null,
        changes: {},
      })
      failedLogReturned = true
    } finally {
      payload.logger.error = logError
    }
    pageCommitted = await payload.create({
      collection: 'pages',
      data: pageData('savepoint', tenantA.id),
      req,
      context,
    })
    await commitTransaction(req)
  } catch (err) {
    await killTransaction(req)
    payload.logger.error({ msg: 'verify: savepoint case threw', err })
  }
  check('savepoint: writeAuditLog returns without throwing on a database error', failedLogReturned)
  check('savepoint: the failure is logged as an error', errors.length > 0)
  const committed = pageCommitted
    ? await payload.find({
        collection: 'pages',
        where: { id: { equals: pageCommitted.id } },
        depth: 0,
      })
    : null
  check(
    'savepoint: the page saved after it on the same request is committed',
    committed?.totalDocs === 1,
  )
  check(
    'savepoint: that page has its create row, the failed entry has none',
    pageCommitted !== null &&
      (await rowsFor('pages', pageCommitted.id)).length === 1 &&
      (await rowsWhere({ docId: { equals: 'verify-audit-bad' } })).length === 0,
  )
} catch (err) {
  payload.logger.error({ msg: 'verify: auditLogs crashed', err })
  check('verify ran to the end', false)
} finally {
  await cleanup()
}

if (failures() > 0) {
  payload.logger.error(`verify: auditLogs ${failures()} check(s) failed`)
  process.exit(1)
}
payload.logger.info('verify: auditLogs all checks passed')
process.exit(0)
