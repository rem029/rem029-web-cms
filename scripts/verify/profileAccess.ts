/**
 * Checks that collection access comes from `users-access` profiles (rem0001 phase 2), as the
 * seeded users (`pnpm seed`): default@, editor@, viewer@example.test.
 *
 *   pnpm payload run scripts/verify/profileAccess.ts
 *   or: pnpm verify
 *
 * Local API with `overrideAccess: false`. Creates and deletes its own test docs (`verify-…`).
 * Refuses to run in production.
 */
import config from '@payload-config'
import type { CollectionSlug, PayloadRequest, RequiredDataFromCollectionSlug } from 'payload'
import { getPayload } from 'payload'

import { DEFAULT_ACCESS_SLUG } from '@/collections/UsersAccess/utils/defaultProfile'
import { adminAccess, hiddenResolver } from '@/common/utils/access'
import { DEFAULT_TENANT_SLUG } from '@/common/utils/defaultTenant'
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

/** true when the call is refused by access control (Forbidden), false when it succeeds. */
const isForbidden = async (fn: () => Promise<unknown>): Promise<boolean> => {
  try {
    await fn()
    return false
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err && err.status === 403) return true
    payload.logger.error({ msg: 'verify: unexpected error', err })
    return false
  }
}

const VERIFY_PAGE_SLUG = 'verify-profile-access'
const VERIFY_USER_EMAIL = 'verify-profile-access@example.test'

/** A seeded user with the access record populated, as `payload.auth()` gives it. */
const loadUser = async (email: string): Promise<User> => {
  const { docs } = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    depth: 1,
    limit: 1,
  })
  if (!docs[0]) throw new Error(`verify: seeded user ${email} not found, run pnpm seed`)
  return { ...docs[0], collection: 'users' } as User
}

const asReq = (user: User): PayloadRequest => ({ user, payload }) as unknown as PayloadRequest

const profileSlug = (user: User): string | null =>
  user.access && typeof user.access === 'object' ? user.access.slug : null

const cleanup = async (): Promise<void> => {
  await payload.delete({ collection: 'pages', where: { slug: { equals: VERIFY_PAGE_SLUG } } })
  await payload.delete({ collection: 'users', where: { email: { equals: VERIFY_USER_EMAIL } } })
}

try {
  await cleanup()

  const superUser = await loadUser(process.env.SEED_ADMIN_EMAIL || 'default@payload.com')
  const defaultUser = await loadUser('default@example.test')
  const editor = await loadUser('editor@example.test')
  const viewer = await loadUser('viewer@example.test')

  const { docs: tenants } = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: DEFAULT_TENANT_SLUG } },
    limit: 1,
    depth: 0,
  })
  const tenantId = tenants[0]?.id
  if (!tenantId) throw new Error(`verify: tenant ${DEFAULT_TENANT_SLUG} not found`)

  // profiles
  check('seed: default@ has the default profile', profileSlug(defaultUser) === DEFAULT_ACCESS_SLUG)
  check('seed: editor@ has the editor profile', profileSlug(editor) === 'editor')
  check('seed: viewer@ has the viewer profile', profileSlug(viewer) === 'viewer')

  // /admin
  for (const user of [defaultUser, editor, viewer]) {
    check(`admin: ${user.email} can open /admin`, adminAccess({ req: asReq(user) }) === true)
  }
  check('admin: super user can open /admin', adminAccess({ req: asReq(superUser) }) === true)
  const noProfile = { ...viewer, access: null } as User
  check(
    'admin: user without a profile is refused',
    adminAccess({ req: asReq(noProfile) }) === false,
  )

  // nav (admin.hidden)
  const hidden = (slug: CollectionSlug, user: User) => hiddenResolver(slug)({ user })
  check('nav: editor sees pages', hidden('pages', editor) === false)
  check('nav: editor sees header', hidden('header', editor) === false)
  check('nav: editor does not see users-access', hidden('users-access', editor) === true)
  check('nav: editor does not see tenants', hidden('tenants', editor) === true)
  check('nav: editor does not see users', hidden('users', editor) === true)
  check('nav: viewer sees pages', hidden('pages', viewer) === false)
  for (const slug of ['pages', 'media', 'users', 'users-access', 'tenants'] as const) {
    check(`nav: default does not see ${slug}`, hidden(slug, defaultUser) === true)
  }
  check('nav: super user sees users-access', hidden('users-access', superUser) === false)
  for (const slug of ['forms', 'form-submissions', 'redirects', 'search'] as const) {
    check(`nav: editor does not see plugin collection ${slug}`, hidden(slug, editor) === true)
  }

  // plugin collections: public ops stay public, the rest needs a profile row
  for (const user of [defaultUser, editor, viewer]) {
    check(
      `form-submissions: ${user.email} cannot read`,
      await isForbidden(() =>
        payload.find({ collection: 'form-submissions', user, overrideAccess: false }),
      ),
    )
    check(
      `forms: ${user.email} cannot create`,
      await isForbidden(() =>
        payload.create({
          collection: 'forms',
          data: { title: 'verify', fields: [] },
          user,
          overrideAccess: false,
        }),
      ),
    )
  }
  check(
    'forms: anonymous can still read (public)',
    !(await isForbidden(() => payload.find({ collection: 'forms', overrideAccess: false }))),
  )
  check(
    'redirects: anonymous can still read (public)',
    !(await isForbidden(() => payload.find({ collection: 'redirects', overrideAccess: false }))),
  )

  // pages: editor CRUD, viewer and default read-only via the public rule
  // saved as a draft, so hero and layout aren't validated
  const pageData = {
    title: 'Verify profile access',
    slug: VERIFY_PAGE_SLUG,
    tenant: tenantId,
  } as RequiredDataFromCollectionSlug<'pages'>
  const context = { disableRevalidate: true }
  check(
    'pages: viewer cannot create',
    await isForbidden(() =>
      payload.create({
        collection: 'pages',
        draft: true,
        data: pageData,
        user: viewer,
        overrideAccess: false,
        context,
      }),
    ),
  )
  check(
    'pages: default cannot create',
    await isForbidden(() =>
      payload.create({
        collection: 'pages',
        draft: true,
        data: pageData,
        user: defaultUser,
        overrideAccess: false,
        context,
      }),
    ),
  )
  const page = await payload.create({
    collection: 'pages',
    draft: true,
    data: pageData,
    user: editor,
    overrideAccess: false,
    context,
  })
  check('pages: editor can create', Boolean(page.id))
  const seesDraft = async (user: User | null): Promise<boolean> => {
    const { docs } = await payload.find({
      collection: 'pages',
      where: { id: { equals: page.id } },
      draft: true,
      depth: 0,
      overrideAccess: false,
      ...(user ? { user } : {}),
    })
    return docs.length === 1
  }
  check('pages: editor sees the draft', await seesDraft(editor))
  check('pages: viewer sees the draft (has pages read)', await seesDraft(viewer))
  check('pages: default does not see the draft', !(await seesDraft(defaultUser)))
  check('pages: anonymous does not see the draft', !(await seesDraft(null)))
  check(
    'pages: viewer cannot update',
    await isForbidden(() =>
      payload.update({
        collection: 'pages',
        draft: true,
        id: page.id,
        data: { title: 'viewer edit' },
        user: viewer,
        overrideAccess: false,
        context,
      }),
    ),
  )
  check(
    'pages: editor can update',
    !(await isForbidden(() =>
      payload.update({
        collection: 'pages',
        draft: true,
        id: page.id,
        data: { title: 'editor edit' },
        user: editor,
        overrideAccess: false,
        context,
      }),
    )),
  )
  check(
    'pages: viewer cannot delete',
    await isForbidden(() =>
      payload.delete({
        collection: 'pages',
        id: page.id,
        user: viewer,
        overrideAccess: false,
        context,
      }),
    ),
  )
  check(
    'pages: editor can delete',
    !(await isForbidden(() =>
      payload.delete({
        collection: 'pages',
        id: page.id,
        user: editor,
        overrideAccess: false,
        context,
      }),
    )),
  )

  // header (former global): editor read + update, viewer read only
  const { docs: headers } = await payload.find({
    collection: 'header',
    where: { tenant: { equals: tenantId } },
    limit: 1,
    depth: 0,
  })
  const header = headers[0]
  if (!header) throw new Error('verify: no header doc for the default tenant')
  const updateHeader = (user: User) => () =>
    payload.update({
      collection: 'header',
      id: header.id,
      data: {},
      user,
      overrideAccess: false,
      context,
    })
  check('header: editor can update', !(await isForbidden(updateHeader(editor))))
  check('header: viewer cannot update', await isForbidden(updateHeader(viewer)))
  check('header: default cannot update', await isForbidden(updateHeader(defaultUser)))

  // collections without a row in the profile
  for (const user of [defaultUser, editor, viewer]) {
    check(
      `analytics: ${user.email} cannot read`,
      await isForbidden(() =>
        payload.find({ collection: 'analytics', user, overrideAccess: false }),
      ),
    )
    check(
      `users-access: ${user.email} cannot read`,
      await isForbidden(() =>
        payload.find({ collection: 'users-access', user, overrideAccess: false }),
      ),
    )
  }

  // users: without `users.read` you only see yourself
  for (const user of [defaultUser, viewer]) {
    const { docs } = await payload.find({
      collection: 'users',
      user,
      overrideAccess: false,
      depth: 0,
    })
    check(`users: ${user.email} sees only themselves`, docs.length === 1 && docs[0]?.id === user.id)
  }
  check(
    'users: editor cannot create users',
    await isForbidden(() =>
      payload.create({
        collection: 'users',
        data: { email: VERIFY_USER_EMAIL, password: VERIFY_USER_EMAIL },
        user: editor,
        overrideAccess: false,
      }),
    ),
  )

  // a new user created by a super user gets the default profile
  const created = await payload.create({
    collection: 'users',
    data: {
      email: VERIFY_USER_EMAIL,
      password: VERIFY_USER_EMAIL,
      tenants: [{ tenant: tenantId }],
    },
    user: superUser,
    overrideAccess: false,
    depth: 1,
  })
  check('users: new user gets the default profile', profileSlug(created) === DEFAULT_ACCESS_SLUG)
} catch (err) {
  failures++
  payload.logger.error({ msg: 'verify: profileAccess crashed', err })
} finally {
  await cleanup()
}

if (failures > 0) {
  payload.logger.error(`verify: profileAccess ${failures} check(s) failed`)
  process.exit(1)
}
payload.logger.info('verify: profileAccess all checks passed')
process.exit(0)
