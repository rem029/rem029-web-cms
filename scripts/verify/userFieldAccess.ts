/**
 * Checks field-level access on `users` (rem0001 phase 3): a non-super user edits only their own
 * name and password, sees only themselves, can't raise anyone's access; disabled users get
 * nothing; the last super user can't be removed. Uses the seeded users (`pnpm seed`).
 *
 *   pnpm payload run scripts/verify/userFieldAccess.ts
 *   or: pnpm verify
 *
 * Local API with `overrideAccess: false`. Creates and deletes its own test users (`verify-…`).
 * Refuses to run in production.
 */
import config from '@payload-config'
import type { PayloadRequest } from 'payload'
import { createLocalReq, getPayload } from 'payload'

import { DEFAULT_ACCESS_SLUG } from '@/collections/UsersAccess/utils/defaultProfile'
import { adminAccess, hasAccess } from '@/common/utils/access'
import type { User } from '@/payload-types'

if (process.env.NODE_ENV === 'production') {
  console.error('verify: refusing to run with NODE_ENV=production')
  process.exit(1)
}

const payload = await getPayload({ config })

let failures = 0
const check = (name: string, ok: boolean): void => {
  if (ok) {
    payload.logger.info(`PASS ${name}`)
    return
  }
  failures++
  payload.logger.error(`FAIL ${name}`)
}

const statusOf = (err: unknown): number | undefined =>
  err && typeof err === 'object' && 'status' in err ? (err.status as number) : undefined

/** true when the call is refused with one of the given statuses, false when it succeeds. */
const isRefused = async (fn: () => Promise<unknown>, statuses = [403]): Promise<boolean> => {
  try {
    await fn()
    return false
  } catch (err) {
    const status = statusOf(err)
    if (status && statuses.includes(status)) return true
    payload.logger.error({ msg: 'verify: unexpected error', status, err })
    return false
  }
}

const succeeds = async (fn: () => Promise<unknown>): Promise<boolean> => {
  try {
    await fn()
    return true
  } catch (err) {
    payload.logger.error({ msg: 'verify: unexpected error', err })
    return false
  }
}

const TEMP_PREFIX = 'verify-user-field-access'
const tempEmail = (name: string) => `${TEMP_PREFIX}-${name}@example.test`

const loadUser = async (email: string): Promise<User> => {
  const { docs } = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    depth: 1,
    limit: 1,
  })
  if (!docs[0]) throw new Error(`verify: user ${email} not found, run pnpm seed`)
  return { ...docs[0], collection: 'users' } as User
}

const asReq = (user: User): PayloadRequest => ({ user, payload }) as unknown as PayloadRequest

const idOf = (value: unknown): unknown =>
  value && typeof value === 'object' && 'id' in value ? value.id : value

const tenantIds = (user: User): unknown[] => (user.tenants ?? []).map((row) => idOf(row.tenant))

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

  const superUser = await loadUser(process.env.SEED_ADMIN_EMAIL || 'default@payload.com')
  const editor = await loadUser('editor@example.test')
  const viewer = await loadUser('viewer@example.test')
  const editorTenants = tenantIds(editor)

  const updateSelf = (data: Record<string, unknown>) => () =>
    payload.update({
      collection: 'users',
      id: editor.id,
      data,
      user: editor,
      overrideAccess: false,
    })

  // escalation on self: an error, not a silent strip
  const otherProfile = idOf(viewer.access)
  const escalations: [string, Record<string, unknown>][] = [
    ['super_user', { super_user: true }],
    ['access', { access: otherProfile }],
    ['tenants', { tenants: [] }],
    ['is_disabled', { is_disabled: true }],
    ['email', { email: tempEmail('renamed') }],
  ]
  for (const [field, data] of escalations) {
    check(`self: editor cannot set ${field}`, await isRefused(updateSelf(data)))
  }
  const editorAfter = await loadUser(editor.email)
  check('self: editor still not a super user', editorAfter.super_user !== true)
  check(
    'self: editor profile unchanged',
    idOf(editorAfter.access) === idOf(editor.access) && editorAfter.email === editor.email,
  )

  // own name, and a save that resends unchanged fields (what the admin form does)
  check('self: editor can change own name', await succeeds(updateSelf({ name: 'Editor Renamed' })))
  check(
    'self: editor save with unchanged sensitive fields works',
    await succeeds(
      updateSelf({
        name: 'Editor User',
        email: ` ${editor.email.toUpperCase()} `,
        super_user: false,
        is_disabled: null,
        access: editor.access,
        tenants: editor.tenants,
      }),
    ),
  )
  check(
    'self: editor keeps tenant membership after own saves (phase 2 watch)',
    JSON.stringify(tenantIds(await loadUser(editor.email))) === JSON.stringify(editorTenants) &&
      editorTenants.length > 0,
  )

  // own password
  const newPassword = `${editor.email}-new`
  check(
    'self: editor can change own password',
    await succeeds(updateSelf({ password: newPassword })),
  )
  check('self: editor logs in with the new password', await canLogin(editor.email, newPassword))
  await payload.update({ collection: 'users', id: editor.id, data: { password: editor.email } })

  // other users
  check(
    'others: editor cannot change viewer name',
    await isRefused(
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
    (await loadUser(viewer.email)).super_user !== true,
  )
  check(
    'others: editor bulk update refused',
    await isRefused(() =>
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
  check('read: editor sees only themselves', seen.length === 1 && seen[0]?.id === editor.id)
  check(
    'read: editor does not see is_disabled',
    seen[0] !== undefined && !('is_disabled' in seen[0]),
  )
  check(
    'create: editor cannot create users',
    await isRefused(() =>
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
      () =>
        payload.delete({ collection: 'users', id: viewer.id, user: editor, overrideAccess: false }),
      [403, 404],
    ),
  )

  // disabled users
  const disabledSeed = await loadUser('disabled@example.test')
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
  const oldSession = sessionUser ? ({ ...sessionUser, collection: 'users' } as User) : null
  check(
    'disabled: an old token gets no /admin',
    oldSession !== null && adminAccess({ req: asReq(oldSession) }) === false,
  )
  check(
    'disabled: an old token cannot read users',
    oldSession !== null &&
      (await isRefused(() =>
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
    data: { email: tempEmailSuper, password: tempEmailSuper, super_user: true },
    user: superUser,
    overrideAccess: false,
  })
  const disabledSuper = { ...tempSuper, is_disabled: true, collection: 'users' } as User
  check(
    'disabled: a disabled super user is denied',
    hasAccess(asReq(disabledSuper), 'pages', 'update') === false,
  )

  // unticking super_user on a user without a profile assigns the default one
  const unticked = await payload.update({
    collection: 'users',
    id: tempSuper.id,
    data: { super_user: false, access: null },
    user: superUser,
    overrideAccess: false,
    depth: 1,
  })
  check(
    'super_user: unticked user without a profile gets default',
    unticked.access !== null &&
      typeof unticked.access === 'object' &&
      unticked.access.slug === DEFAULT_ACCESS_SLUG,
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
      await isRefused(asLast({ super_user: false }), [400]),
    )
    check(
      'last super user: cannot disable themselves',
      await isRefused(asLast({ is_disabled: true }), [400]),
    )
    check(
      'last super user: cannot be deleted',
      await isRefused(
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
    (await loadUser(superUser.email)).super_user === true,
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
    await succeeds(() =>
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
  failures++
  payload.logger.error({ msg: 'verify: userFieldAccess crashed', err })
} finally {
  await cleanup()
}

if (failures > 0) {
  payload.logger.error(`verify: userFieldAccess ${failures} check(s) failed`)
  process.exit(1)
}
payload.logger.info('verify: userFieldAccess all checks passed')
process.exit(0)
