/**
 * Checks field-level access on `users` (rem0001 phase 3): a non-super user edits only their own
 * name and password, sees only themselves and their colleagues (since phase 6), can't raise anyone's access; disabled users get
 * nothing; the last super user can't be removed. Uses the seeded users (`pnpm seed`).
 *
 *   pnpm payload run scripts/verify/userFieldAccess.ts
 *   or: pnpm verify
 *
 * Local API with `overrideAccess: false`. Creates and deletes its own test users (`verify-…`).
 * Refuses to run in production.
 */
import config from '@payload-config'
import { createLocalReq, getPayload } from 'payload'

import { DEFAULT_ACCESS_SLUG } from '@/collections/UsersAccess/utils/defaultProfile'
import { adminAccess, hasAccess } from '@/common/utils/access'
import { DEFAULT_TENANT_SLUG } from '@/common/utils/defaultTenant'
import {
  asSessionUser,
  createChecker,
  idOf,
  isRefused,
  loadUser,
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

const TEMP_PREFIX = 'verify-user-field-access'
const tempEmail = (name: string) => `${TEMP_PREFIX}-${name}@example.test`

const tenantIds = (user: SessionUser): unknown[] =>
  (user.tenants ?? []).map((row) => idOf(row.tenant))

const cleanup = async (): Promise<void> => {
  await payload.delete({
    collection: 'users',
    where: { email: { like: `${TEMP_PREFIX}-` } },
  })
}

const canLogin = async (email: string, password: string): Promise<boolean> => {
  try {
    const result = await payload.login({ collection: 'users', data: { email, password } })
    return Boolean(result.token)
  } catch {
    return false
  }
}

try {
  await cleanup()

  const superUser = await loadUser(payload, process.env.SEED_ADMIN_EMAIL || 'default@payload.com')
  const editor = await loadUser(payload, 'editor@example.test')
  const viewer = await loadUser(payload, 'viewer@example.test')
  const editorTenants = tenantIds(editor)

  const { docs: adminTenants } = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: DEFAULT_TENANT_SLUG } },
    limit: 1,
    depth: 0,
  })
  const adminTenantId = adminTenants[0]?.id
  if (!adminTenantId) throw new Error('verify: admin tenant not found')

  const updateSelf = (data: Record<string, unknown>) => () =>
    payload.update({
      collection: 'users',
      id: editor.id,
      data,
      user: editor,
      overrideAccess: false,
    })

  // escalation on self: an error, not a silent strip
  const viewerProfileId = idOf(viewer.tenants?.[0]?.access)
  const escalatedTenants = (editor.tenants ?? []).map((row) => ({
    ...row,
    tenant: idOf(row.tenant),
    access: viewerProfileId,
  }))
  const escalations: [string, Record<string, unknown>][] = [
    ['super_user', { super_user: true }],
    ['tenants.access', { tenants: escalatedTenants }],
    ['tenants', { tenants: [] }],
    ['is_disabled', { is_disabled: true }],
    ['email', { email: tempEmail('renamed') }],
  ]
  for (const [field, data] of escalations) {
    check(`self: editor cannot set ${field}`, await isRefused(payload, updateSelf(data)))
  }

  // duplicate tenant rows check
  const firstTenant = editor.tenants?.[0]
  if (firstTenant) {
    const duplicateRows = [
      ...(editor.tenants ?? []).map((row) => ({
        tenant: idOf(row.tenant),
        access: idOf(row.access),
      })),
      { tenant: idOf(firstTenant.tenant), access: viewerProfileId },
    ]
    check(
      'self: editor sending duplicate rows refused',
      await isRefused(payload, updateSelf({ tenants: duplicateRows })),
    )
  }

  const rowPairs = (u: SessionUser): string[] =>
    (u.tenants ?? []).map((r) => `${String(idOf(r.tenant))}:${String(idOf(r.access))}`).sort()
  const editorAfter = await loadUser(payload, editor.email)
  check('self: editor still not a super user', editorAfter.super_user !== true)
  check(
    'self: editor profile unchanged',
    JSON.stringify(rowPairs(editorAfter)) === JSON.stringify(rowPairs(editor)) &&
      editorAfter.email === editor.email,
  )

  // own name, and a save that resends unchanged fields (what the admin form does)
  check(
    'self: editor can change own name',
    await succeeds(payload, updateSelf({ name: 'Editor Renamed' })),
  )
  check(
    'self: editor save with unchanged sensitive fields works',
    await succeeds(
      payload,
      updateSelf({
        name: 'Editor User',
        email: ` ${editor.email.toUpperCase()} `,
        super_user: false,
        is_disabled: null,
        tenants: editor.tenants,
      }),
    ),
  )
  check(
    'self: editor keeps tenant membership after own saves (phase 2 watch)',
    JSON.stringify(tenantIds(await loadUser(payload, editor.email))) ===
      JSON.stringify(editorTenants) && editorTenants.length > 0,
  )

  // own password
  const newPassword = `${editor.email}-new`
  check(
    'self: editor can change own password',
    await succeeds(payload, updateSelf({ password: newPassword })),
  )
  check('self: editor logs in with the new password', await canLogin(editor.email, newPassword))
  await payload.update({ collection: 'users', id: editor.id, data: { password: editor.email } })

  // other users
  check(
    'others: editor cannot change viewer name',
    await isRefused(
      payload,
      () =>
        payload.update({
          collection: 'users',
          id: viewer.id,
          data: { name: 'hacked' },
          user: editor,
          overrideAccess: false,
        }),
      [403, 404],
    ),
  )
  check(
    'others: editor cannot make viewer a super user',
    await isRefused(
      payload,
      () =>
        payload.update({
          collection: 'users',
          id: viewer.id,
          data: { super_user: true },
          user: editor,
          overrideAccess: false,
        }),
      [403, 404],
    ),
  )
  check(
    'others: viewer is still not a super user',
    (await loadUser(payload, viewer.email)).super_user !== true,
  )
  check(
    'others: editor bulk update refused',
    await isRefused(payload, () =>
      payload.update({
        collection: 'users',
        where: { id: { equals: editor.id } },
        data: { name: 'bulk' },
        user: editor,
        overrideAccess: false,
      }),
    ),
  )
  const { docs: seen } = await payload.find({
    collection: 'users',
    user: editor,
    overrideAccess: false,
    depth: 0,
  })
  // colleagues are readable since rem0001 phase 6 (the "Visible to" picker); super users aren't
  const editorSelf = seen.find((u) => u.id === editor.id)
  check(
    'read: editor sees themselves, no super users',
    editorSelf !== undefined && !seen.some((u) => u.super_user === true),
  )
  check(
    'read: editor does not see is_disabled',
    seen.length > 0 && seen.every((u) => !('is_disabled' in u)),
  )
  check(
    'create: editor cannot create users',
    await isRefused(payload, () =>
      payload.create({
        collection: 'users',
        data: { email: tempEmail('by-editor'), password: tempEmail('by-editor') },
        user: editor,
        overrideAccess: false,
      }),
    ),
  )
  check(
    'delete: editor cannot delete viewer',
    await isRefused(
      payload,
      () =>
        payload.delete({
          collection: 'users',
          id: viewer.id,
          user: editor,
          overrideAccess: false,
        }),
      [403, 404],
    ),
  )

  // disabled users
  const disabledSeed = await loadUser(payload, 'disabled@example.test')
  check('disabled: seeded disabled@ is disabled', disabledSeed.is_disabled === true)
  check(
    'disabled: seeded disabled@ cannot log in',
    !(await canLogin(disabledSeed.email, disabledSeed.email)),
  )

  const tempEmailDisabled = tempEmail('disabled')
  const temp = await payload.create({
    collection: 'users',
    data: { email: tempEmailDisabled, password: tempEmailDisabled, name: 'verify' },
    user: superUser,
    overrideAccess: false,
  })
  const { token } = await payload.login({
    collection: 'users',
    data: { email: tempEmailDisabled, password: tempEmailDisabled },
  })
  await payload.update({
    collection: 'users',
    id: temp.id,
    data: { is_disabled: true },
    user: superUser,
    overrideAccess: false,
  })
  const { user: sessionUser } = await payload.auth({
    headers: new Headers({ Authorization: `JWT ${token}` }),
  })
  const oldSession = sessionUser ? asSessionUser(sessionUser) : null
  check(
    'disabled: an old token gets no /admin',
    oldSession !== null && adminAccess({ req: await reqFor(payload, oldSession) }) === false,
  )
  check(
    'disabled: an old token cannot read users',
    oldSession !== null &&
      (await isRefused(payload, () =>
        payload.find({ collection: 'users', user: oldSession, overrideAccess: false }),
      )),
  )
  check(
    'disabled: login refused after disabling',
    !(await canLogin(tempEmailDisabled, tempEmailDisabled)),
  )

  // a disabled super user has no access either
  const tempEmailSuper = tempEmail('super')
  const tempSuper = await payload.create({
    collection: 'users',
    data: {
      email: tempEmailSuper,
      password: tempEmailSuper,
      super_user: true,
      tenants: [{ tenant: adminTenantId }],
    },
    user: superUser,
    overrideAccess: false,
  })
  const disabledSuper: SessionUser = {
    ...tempSuper,
    is_disabled: true,
    collection: 'users',
  }
  check(
    'disabled: a disabled super user is denied',
    hasAccess(await reqFor(payload, disabledSuper), 'pages', 'update') === false,
  )

  // unticking super_user on a user without a profile assigns the default one
  await payload.update({
    collection: 'users',
    id: tempSuper.id,
    data: { super_user: false },
    user: superUser,
    overrideAccess: false,
  })
  const unticked = await loadUser(payload, tempEmailSuper)
  const untickedRow = (unticked.tenants ?? []).find((r) => idOf(r.tenant) === adminTenantId)
  const untickedAccess = untickedRow?.access
  check(
    'super_user: unticked user without a profile gets default',
    untickedAccess !== null &&
      typeof untickedAccess === 'object' &&
      'slug' in untickedAccess &&
      untickedAccess.slug === DEFAULT_ACCESS_SLUG,
  )

  // last super user: in a rolled-back transaction, make the seeded super user the only one
  const req = await createLocalReq({}, payload)
  req.transactionID = (await payload.db.beginTransaction()) ?? undefined
  try {
    await payload.update({
      collection: 'users',
      where: { and: [{ super_user: { equals: true } }, { id: { not_equals: superUser.id } }] },
      data: { super_user: false },
      req,
    })
    const asLast = (data: Record<string, unknown>) => () =>
      payload.update({
        collection: 'users',
        id: superUser.id,
        data,
        user: superUser,
        overrideAccess: false,
        req,
      })
    check(
      'last super user: cannot untick themselves',
      await isRefused(payload, asLast({ super_user: false }), [400]),
    )
    check(
      'last super user: cannot disable themselves',
      await isRefused(payload, asLast({ is_disabled: true }), [400]),
    )
    check(
      'last super user: cannot be deleted',
      await isRefused(
        payload,
        () =>
          payload.delete({
            collection: 'users',
            id: superUser.id,
            user: superUser,
            overrideAccess: false,
            req,
          }),
        [400],
      ),
    )
  } finally {
    if (req.transactionID) await payload.db.rollbackTransaction(req.transactionID)
  }
  check(
    'last super user: rollback kept the super user',
    (await loadUser(payload, superUser.email)).super_user === true,
  )

  // forgot / reset password (unauthenticated) for a non-super user
  const tempEmailReset = tempEmail('reset')
  await payload.create({
    collection: 'users',
    data: { email: tempEmailReset, password: tempEmailReset },
    user: superUser,
    overrideAccess: false,
  })
  const resetToken = await payload.forgotPassword({
    collection: 'users',
    data: { email: tempEmailReset },
    disableEmail: true,
  })
  check(
    'reset: reset password works for a non-super user',
    await succeeds(payload, () =>
      payload.resetPassword({
        collection: 'users',
        data: { token: String(resetToken), password: `${tempEmailReset}-new` },
        // the REST endpoint leaves overrideAccess unset, which the read-back after the reset
        // treats as true; with false it would be refused (no req.user yet)
        overrideAccess: true,
      }),
    ),
  )
  check(
    'reset: logs in with the new password',
    await canLogin(tempEmailReset, `${tempEmailReset}-new`),
  )
} catch (err) {
  check('verify: userFieldAccess unexpected error', false)
  payload.logger.error({ msg: 'verify: userFieldAccess crashed', err })
} finally {
  await cleanup()
}

if (failures() > 0) {
  payload.logger.error(`verify: userFieldAccess ${failures()} check(s) failed`)
  process.exit(1)
}
payload.logger.info('verify: userFieldAccess all checks passed')
process.exit(0)
