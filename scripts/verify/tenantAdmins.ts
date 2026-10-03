/**
 * Checks tenant admins (rem0001 phase 5): the "Tenant admin" box on a `users.tenants[]` row lets
 * that user manage the tenant's content, members and access profiles, and nothing outside it.
 * As the seeded users (`pnpm seed`): owner@ (tenant admin of tenant1 + tenant2), editor1@
 * (tenant1 profile `editor`), cashier2@ (tenant2 profile `cashier`).
 *
 *   pnpm payload run scripts/verify/tenantAdmins.ts
 *   or: pnpm verify
 *
 * Local API with `overrideAccess: false`. Creates and deletes its own docs (`verify-ta-…`) and
 * puts the tenant1 name back. Refuses to run in production.
 */
import config from '@payload-config'
import { getPayload } from 'payload'

import { canCreatePassword, isSelfOrSuperUserField } from '@/collections/Users/utils/access'
import { adminAccess, hiddenResolver } from '@/common/utils/access'
import { extractTenantId } from '@/common/utils/tenantCollections'
import type { Tenant, User } from '@/payload-types'
import {
  adminTenantIdOf,
  createChecker,
  isRefused,
  loadUser,
  makeUser,
  platformProfileWhere,
  reqFor,
  statusOf,
  succeeds,
  type AccessRow,
  type SessionUser,
  type TenantRow,
} from './lib/verifyKit'

if (process.env.NODE_ENV === 'production') {
  console.error('verify: refusing to run with NODE_ENV=production')
  process.exit(1)
}

const payload = await getPayload({ config })
const { check, fail, failures } = createChecker(payload)

const PREFIX = 'verify-ta'
const context = { disableRevalidate: true }

const cleanup = async (): Promise<void> => {
  await payload.delete({ collection: 'users', where: { email: { like: `${PREFIX}-` } } })
  await payload.delete({ collection: 'users-access', where: { slug: { like: `${PREFIX}-` } } })
}

const findTenant = async (slug: string): Promise<Tenant> => {
  const { docs } = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    locale: 'en',
  })
  if (!docs[0]) throw new Error(`verify: tenant ${slug} not found, run pnpm seed`)
  return docs[0]
}

const profileId = async (tenant: Tenant, slug: string): Promise<number> => {
  const { docs } = await payload.find({
    collection: 'users-access',
    where: { and: [{ slug: { equals: slug } }, { tenant: { equals: tenant.id } }] },
    limit: 1,
    depth: 0,
  })
  if (!docs[0]) throw new Error(`verify: profile ${tenant.slug}/${slug} not found, run pnpm seed`)
  return docs[0].id
}

/** a user's rows as ids, the shape a client sends back */
const rowsOf = (user: Pick<User, 'tenants'>): TenantRow[] =>
  (user.tenants ?? []).flatMap((row) => {
    const tenant = extractTenantId(row.tenant)
    if (tenant === null) return []
    return [
      { tenant, access: extractTenantId(row.access), isTenantAdmin: row.isTenantAdmin === true },
    ]
  })

/** rows as stored (no access check, no row filter) */
const storedRows = async (id: number): Promise<TenantRow[]> =>
  rowsOf(await payload.findByID({ collection: 'users', id, depth: 0 }))

const tenantIdsOf = (rows: TenantRow[]): number[] =>
  rows.flatMap((row) => {
    const id = extractTenantId(row.tenant)
    return id === null ? [] : [id]
  })

/** a user made by the super user for one check */
const makeTestUser = async (
  superUser: SessionUser,
  name: string,
  tenants: TenantRow[],
  extra?: { super_user?: boolean },
): Promise<User> =>
  payload.create({
    collection: 'users',
    data: { email: `${PREFIX}-${name}@example.test`, password: `${PREFIX}-pw`, tenants, ...extra },
    user: superUser,
    overrideAccess: false,
  })

const isRecordLike = (val: unknown): val is Record<string, unknown> =>
  typeof val === 'object' && val !== null

const isValidationError = async (fn: () => Promise<unknown>, text: string): Promise<boolean> => {
  try {
    await fn()
    return false
  } catch (err) {
    // a ValidationError carries the field messages in data.errors[].message
    const errors =
      err && typeof err === 'object' && 'data' in err && isRecordLike(err.data)
        ? err.data.errors
        : []
    const messages = Array.isArray(errors)
      ? errors.map((e) => (isRecordLike(e) && typeof e.message === 'string' ? e.message : ''))
      : []
    return statusOf(err) === 400 && messages.some((message) => message.includes(text))
  }
}

let tenant1NameBefore: string | null = null
let tenant1Id: number | null = null

try {
  await cleanup()

  const superUser = await loadUser(payload, process.env.SEED_ADMIN_EMAIL || 'default@payload.com')
  const owner = await loadUser(payload, 'owner@example.test')
  const editor1 = await loadUser(payload, 'editor1@example.test')
  const cashier2 = await loadUser(payload, 'cashier2@example.test')
  const t1 = await findTenant('tenant1')
  const t2 = await findTenant('tenant2')
  const t3 = await findTenant('tenant3')
  tenant1Id = t1.id
  tenant1NameBefore = t1.name
  const adminTenantId = await adminTenantIdOf(payload)
  const t1Editor = await profileId(t1, 'editor')
  const t1Cashier = await profileId(t1, 'cashier')
  const t2Editor = await profileId(t2, 'editor')
  const t2Cashier = await profileId(t2, 'cashier')
  const platform = async (slug: string): Promise<number> => {
    const { docs } = await payload.find({
      collection: 'users-access',
      where: platformProfileWhere(slug),
      limit: 1,
      depth: 0,
    })
    if (!docs[0]) throw new Error(`verify: platform profile ${slug} not found`)
    return docs[0].id
  }
  const platformDefault = await platform('default')
  const platformEditor = await platform('editor')

  // seed shape
  const ownerRows = rowsOf(owner)
  check(
    'seed: owner@ is tenant admin of tenant1 and tenant2 only',
    ownerRows.length === 2 &&
      ownerRows.every((r) => r.isTenantAdmin) &&
      JSON.stringify(tenantIdsOf(ownerRows).sort()) === JSON.stringify([t1.id, t2.id].sort()),
  )
  check(
    'seed: editor1@ has tenant1 editor, cashier2@ tenant2 cashier',
    JSON.stringify(rowsOf(editor1).map((r) => [r.tenant, r.access])) ===
      JSON.stringify([[t1.id, t1Editor]]) &&
      JSON.stringify(rowsOf(cashier2).map((r) => [r.tenant, r.access])) ===
        JSON.stringify([[t2.id, t2Cashier]]),
  )

  // nav + /admin
  const ownerReq = await reqFor(payload, owner)
  check('nav: owner@ can open /admin', adminAccess({ req: ownerReq }) === true)
  for (const slug of ['users', 'users-access', 'tenants', 'pages', 'header'] as const) {
    check(`nav: owner@ sees ${slug}`, hiddenResolver(slug)({ user: owner }) === false)
  }
  check(
    'nav: editor1@ does not see users-access',
    hiddenResolver('users-access')({ user: editor1 }),
  )

  // test users, made by the super user: shared = tenant1 + tenant3
  const shared = await makeTestUser(superUser, 'shared', [
    { tenant: t1.id, access: t1Editor },
    { tenant: t3.id, access: platformEditor },
  ])
  const t3Only = await makeTestUser(superUser, 't3only', [
    { tenant: t3.id, access: platformEditor },
  ])
  const t1Member = await makeTestUser(superUser, 't1member', [{ tenant: t1.id, access: t1Cashier }])
  const superMember = await makeTestUser(
    superUser,
    'super',
    [{ tenant: t1.id, access: t1Editor }],
    { super_user: true },
  )

  // users: read
  const { docs: visible } = await payload.find({
    collection: 'users',
    user: owner,
    overrideAccess: false,
    depth: 0,
    pagination: false,
  })
  const visibleIds = visible.map((u) => u.id)
  check(
    'users: owner@ sees only users with a tenant1/tenant2 row (and themselves)',
    visible.every(
      (u) => u.id === owner.id || rowsOf(u).some((r) => r.tenant === t1.id || r.tenant === t2.id),
    ) &&
      visibleIds.includes(shared.id) &&
      visibleIds.includes(editor1.id),
  )
  check('users: owner@ does not see a tenant3-only user', !visibleIds.includes(t3Only.id))
  const sharedSeen = visible.find((u) => u.id === shared.id)
  check(
    'users: owner@ sees only the tenant1 row of a tenant1+tenant3 user',
    sharedSeen !== undefined &&
      JSON.stringify(tenantIdsOf(rowsOf(sharedSeen))) === JSON.stringify([t1.id]),
  )
  const ownerSelf = visible.find((u) => u.id === owner.id)
  check(
    'users: owner@ sees all of their own rows',
    ownerSelf !== undefined && rowsOf(ownerSelf).length === 2,
  )
  const { docs: editorSees } = await payload.find({
    collection: 'users',
    user: editor1,
    overrideAccess: false,
    depth: 0,
  })
  check(
    'users: editor1@ (not a tenant admin) sees only themselves',
    editorSees.length === 1 && editorSees[0]?.id === editor1.id,
  )

  // users: update rows of a shared user; the hidden tenant3 row must survive
  const updateRows = (actor: SessionUser, id: number, tenants: TenantRow[]) => () =>
    payload.update({
      collection: 'users',
      id,
      data: { tenants },
      user: actor,
      overrideAccess: false,
    })
  check(
    'rows: owner@ changes the tenant1 profile of a shared user',
    await succeeds(payload, updateRows(owner, shared.id, [{ tenant: t1.id, access: t1Cashier }])),
  )
  const sharedAfter = await storedRows(shared.id)
  check(
    'rows: the tenant3 row the owner never saw is kept',
    sharedAfter.some((r) => r.tenant === t3.id && r.access === platformEditor) &&
      sharedAfter.some((r) => r.tenant === t1.id && r.access === t1Cashier),
  )
  check(
    'rows: owner@ cannot add or edit a tenant3 row',
    await isRefused(
      payload,
      updateRows(owner, shared.id, [
        { tenant: t1.id, access: t1Cashier },
        { tenant: t3.id, access: t1Cashier },
      ]),
    ),
  )
  check(
    "rows: another tenant's profile is refused on a tenant1 row",
    await isRefused(payload, updateRows(owner, t1Member.id, [{ tenant: t1.id, access: t2Editor }])),
  )
  check(
    'rows: a platform profile other than default is refused on a tenant1 row',
    await isRefused(
      payload,
      updateRows(owner, t1Member.id, [{ tenant: t1.id, access: platformEditor }]),
    ),
  )
  check(
    'rows: the platform default profile is accepted',
    await succeeds(
      payload,
      updateRows(owner, t1Member.id, [{ tenant: t1.id, access: platformDefault }]),
    ),
  )
  check(
    'rows: an untouched row with a platform profile is kept when saving',
    await succeeds(payload, () =>
      payload.update({
        collection: 'users',
        id: shared.id,
        data: {
          tenants: rowsOf(sharedSeen ?? { tenants: [] }).map((r) => ({ ...r, access: t1Cashier })),
        },
        user: owner,
        overrideAccess: false,
      }),
    ),
  )
  check(
    'rows: a tenant2 profile is accepted on a tenant2 row with the tenant1 cookie selected',
    await succeeds(payload, async () =>
      payload.update({
        collection: 'users',
        id: t1Member.id,
        data: {
          tenants: [
            { tenant: t1.id, access: platformDefault },
            { tenant: t2.id, access: t2Cashier },
          ],
        },
        req: await reqFor(payload, owner, { tenantCookie: t1.id }),
        overrideAccess: false,
      }),
    ),
  )

  // tenant admin: appoint, demote, own row, last admin, super users
  check(
    'admins: owner@ makes a tenant1 member tenant admin',
    await succeeds(
      payload,
      updateRows(owner, t1Member.id, [
        { tenant: t1.id, access: platformDefault, isTenantAdmin: true },
      ]),
    ),
  )
  check(
    'admins: and demotes them again',
    await succeeds(
      payload,
      updateRows(owner, t1Member.id, [
        { tenant: t1.id, access: platformDefault, isTenantAdmin: false },
      ]),
    ),
  )
  check(
    'admins: the profile is kept while the row is tenant admin',
    (await storedRows(t1Member.id)).some((r) => r.tenant === t1.id && r.access === platformDefault),
  )
  check(
    'admins: owner@ cannot change their own row',
    await isRefused(
      payload,
      updateRows(owner, owner.id, [{ tenant: t1.id, access: t1Editor, isTenantAdmin: false }]),
    ),
  )
  check(
    'admins: owner@ can still rename themselves',
    await succeeds(payload, () =>
      payload.update({
        collection: 'users',
        id: owner.id,
        data: { name: owner.name ?? 'Owner' },
        user: owner,
        overrideAccess: false,
      }),
    ),
  )
  // nobody can edit their own row, so the last admin can only go through a race; an actor that
  // isn't stored stands in for the other side of it
  const ghostAdmin = makeUser({
    id: 999001,
    tenants: [
      { tenant: t1.id, isTenantAdmin: true },
      { tenant: t2.id, isTenantAdmin: true },
    ],
  })
  check(
    'admins: demoting the last tenant admin is refused',
    await isRefused(
      payload,
      updateRows(ghostAdmin, owner.id, [
        { tenant: t1.id, isTenantAdmin: false },
        { tenant: t2.id, isTenantAdmin: true },
      ]),
    ),
  )
  check(
    'admins: removing the last tenant admin row is refused',
    await isRefused(
      payload,
      updateRows(ghostAdmin, owner.id, [{ tenant: t2.id, isTenantAdmin: true }]),
    ),
  )
  check(
    "admins: a super user's row is refused",
    await isRefused(
      payload,
      updateRows(owner, superMember.id, [{ tenant: t1.id, access: t1Cashier }]),
      [403, 404],
    ),
  )
  check(
    'admins: a super user cannot be deleted by a tenant admin',
    await isRefused(
      payload,
      () =>
        payload.delete({
          collection: 'users',
          id: superMember.id,
          user: owner,
          overrideAccess: false,
        }),
      [403, 404],
    ),
  )

  // the admin hides "Change Password" / "Force Unlock" and makes name read-only when these say no
  check(
    "ui: owner@ may not set another user's password (field access)",
    isSelfOrSuperUserField({ req: ownerReq, id: t1Member.id }) === false,
  )
  check(
    "ui: a super user may set another user's password",
    isSelfOrSuperUserField({ req: await reqFor(payload, superUser), id: t1Member.id }) === true,
  )
  check(
    'ui: owner@ may set their own password',
    isSelfOrSuperUserField({ req: ownerReq, id: owner.id }) === true,
  )
  check(
    'ui: owner@ may set a password when creating a user',
    canCreatePassword({ req: ownerReq }) === true,
  )
  check(
    'ui: owner@ cannot unlock another user',
    await isRefused(payload, () =>
      payload.unlock({
        collection: 'users',
        // Payload's generated unlock type requires a password; unlock ignores it
        data: { email: t1Member.email, password: '' },
        req: ownerReq,
        overrideAccess: false,
      }),
    ),
  )

  // other users' sensitive fields
  for (const [field, data] of [
    ['password', { password: 'something-else' }],
    ['name', { name: 'renamed by owner' }],
    ['email', { email: `${PREFIX}-changed@example.test` }],
    ['super_user', { super_user: true }],
    ['is_disabled', { is_disabled: true }],
  ] as const) {
    check(
      `fields: owner@ cannot change another user's ${field}`,
      await isRefused(payload, () =>
        payload.update({
          collection: 'users',
          id: t1Member.id,
          data,
          user: owner,
          overrideAccess: false,
        }),
      ),
    )
  }

  // create + delete users
  const createAs =
    (actor: SessionUser, name: string, tenants: TenantRow[], extra?: { super_user?: boolean }) =>
    () =>
      payload.create({
        collection: 'users',
        data: {
          email: `${PREFIX}-${name}@example.test`,
          password: `${PREFIX}-pw`,
          tenants,
          ...extra,
        },
        user: actor,
        overrideAccess: false,
        depth: 1,
      })
  let created: User | null = null
  try {
    created = await createAs(owner, 'created', [{ tenant: t1.id }])()
  } catch (err) {
    payload.logger.error({ msg: 'verify: owner create failed', err })
  }
  check(
    'create: owner@ creates a tenant1 member, who gets the default profile',
    created !== null &&
      rowsOf(created).some((r) => r.tenant === t1.id && r.access === platformDefault),
  )
  check(
    'create: a tenant3 row is refused',
    await isRefused(payload, createAs(owner, 'c-t3', [{ tenant: t3.id }])),
  )
  check('create: no row is refused', await isRefused(payload, createAs(owner, 'c-none', [])))
  check(
    'create: super_user is refused',
    await isRefused(payload, createAs(owner, 'c-super', [{ tenant: t1.id }], { super_user: true })),
  )
  check(
    'create: editor1@ cannot create users',
    await isRefused(payload, createAs(editor1, 'c-ed', [{ tenant: t1.id }])),
  )
  check(
    'delete: owner@ deletes a user who is only in tenant1',
    created !== null &&
      (await succeeds(payload, () =>
        payload.delete({ collection: 'users', id: created.id, user: owner, overrideAccess: false }),
      )),
  )
  check(
    'delete: a user also in tenant3 is refused',
    await isRefused(payload, () =>
      payload.delete({ collection: 'users', id: shared.id, user: owner, overrideAccess: false }),
    ),
  )

  // profiles (users-access)
  const grants = (slug: AccessRow['slug'], extra: { update?: boolean } = {}) => [
    { slug, hidden: false, read: true, ...extra },
  ]
  const createProfileAs =
    (actor: SessionUser, name: string, tenant: number, access = grants('pages')) =>
    () =>
      payload.create({
        collection: 'users-access',
        data: { name: `Verify ${name}`, slug: `${PREFIX}-${name}`, tenant, access },
        user: actor,
        overrideAccess: false,
      })
  let t1Profile: number | null = null
  try {
    t1Profile = (await createProfileAs(owner, 'p1', t1.id)()).id
  } catch (err) {
    payload.logger.error({ msg: 'verify: owner profile create failed', err })
  }
  check('profiles: owner@ creates a profile in tenant1', t1Profile !== null)
  check(
    'profiles: and assigns it to a tenant1 member',
    t1Profile !== null &&
      (await succeeds(
        payload,
        updateRows(owner, t1Member.id, [{ tenant: t1.id, access: t1Profile }]),
      )),
  )
  check(
    'profiles: and it is refused on their tenant2 row',
    t1Profile !== null &&
      (await isRefused(
        payload,
        updateRows(owner, t1Member.id, [
          { tenant: t1.id, access: t1Profile },
          { tenant: t2.id, access: t1Profile },
        ]),
      )),
  )
  check(
    'profiles: owner@ updates it',
    t1Profile !== null &&
      (await succeeds(payload, () =>
        payload.update({
          collection: 'users-access',
          id: t1Profile ?? 0,
          data: { description: 'edited' },
          user: owner,
          overrideAccess: false,
        }),
      )),
  )
  check(
    'profiles: owner@ cannot move it to tenant3',
    t1Profile !== null &&
      (await isRefused(payload, () =>
        payload.update({
          collection: 'users-access',
          id: t1Profile ?? 0,
          data: { tenant: t3.id },
          user: owner,
          overrideAccess: false,
        }),
      )),
  )
  check(
    'profiles: a profile with users update is rejected (names the slug)',
    await isValidationError(
      createProfileAs(owner, 'p-users', t1.id, grants('users', { update: true })),
      '"users"',
    ),
  )
  check(
    'profiles: a profile with users-access update is rejected',
    await isValidationError(
      createProfileAs(owner, 'p-ua', t1.id, grants('users-access', { update: true })),
      '"users-access"',
    ),
  )
  check(
    'profiles: owner@ cannot create one in tenant3',
    await isRefused(payload, createProfileAs(owner, 'p3', t3.id)),
  )
  check(
    'profiles: owner@ cannot create one on the admin tenant (platform templates)',
    await isRefused(payload, createProfileAs(owner, 'p-admin', adminTenantId)),
  )
  check(
    'profiles: owner@ cannot edit the platform default',
    await isRefused(
      payload,
      () =>
        payload.update({
          collection: 'users-access',
          id: platformDefault,
          data: { description: 'hacked' },
          user: owner,
          overrideAccess: false,
        }),
      [403, 404],
    ),
  )
  const { docs: ownerProfiles } = await payload.find({
    collection: 'users-access',
    user: owner,
    overrideAccess: false,
    depth: 0,
    pagination: false,
  })
  check(
    'profiles: owner@ reads tenant1/tenant2 profiles and the platform default only',
    ownerProfiles.every((p) => {
      const tenant = extractTenantId(p.tenant)
      return tenant === t1.id || tenant === t2.id || p.id === platformDefault
    }) && ownerProfiles.some((p) => p.id === platformDefault),
  )
  check(
    'profiles: editor1@ cannot read profiles',
    await isRefused(payload, () =>
      payload.find({ collection: 'users-access', user: editor1, overrideAccess: false }),
    ),
  )
  check(
    'profiles: owner@ deletes it',
    t1Profile !== null &&
      (await succeeds(payload, () =>
        payload.delete({
          collection: 'users-access',
          id: t1Profile ?? 0,
          user: owner,
          overrideAccess: false,
        }),
      )),
  )

  // tenants
  const updateTenant =
    (id: number, data: Partial<Pick<Tenant, 'name' | 'slug' | 'isActive' | 'domains'>>) => () =>
      payload.update({
        collection: 'tenants',
        id,
        data,
        user: owner,
        overrideAccess: false,
        locale: 'en',
        context,
      })
  check(
    'tenants: owner@ renames tenant1',
    await succeeds(payload, updateTenant(t1.id, { name: `${t1.name} (verify)` })),
  )
  check(
    'tenants: slug change refused',
    await isRefused(payload, updateTenant(t1.id, { slug: 'tenant1-renamed' })),
  )
  check(
    'tenants: isActive change refused',
    await isRefused(payload, updateTenant(t1.id, { isActive: false })),
  )
  check(
    'tenants: domains change refused',
    await isRefused(
      payload,
      updateTenant(t1.id, { domains: [{ domain: 'verify-ta.example.test' }] }),
    ),
  )
  check(
    'tenants: tenant3 update refused',
    await isRefused(payload, updateTenant(t3.id, { name: 'x' }), [403, 404]),
  )
  check(
    'tenants: owner@ cannot create a tenant',
    await isRefused(payload, () =>
      payload.create({
        collection: 'tenants',
        data: { name: 'Verify', slug: `${PREFIX}-tenant` },
        user: owner,
        overrideAccess: false,
      }),
    ),
  )
  check(
    'tenants: owner@ cannot delete a tenant',
    await isRefused(
      payload,
      () =>
        payload.delete({ collection: 'tenants', id: t2.id, user: owner, overrideAccess: false }),
      [403, 404],
    ),
  )

  // header/footer/theme/settings: update only, own tenants only
  for (const slug of ['header', 'footer', 'theme', 'settings'] as const) {
    const docIn = async (tenant: Tenant): Promise<number> => {
      const { docs } = await payload.find({
        collection: slug,
        where: { tenant: { equals: tenant.id } },
        limit: 1,
        depth: 0,
      })
      if (!docs[0]) throw new Error(`verify: no ${slug} doc for ${tenant.slug}`)
      return docs[0].id
    }
    const t1Doc = await docIn(t1)
    const t3Doc = await docIn(t3)
    check(
      `${slug}: owner@ updates tenant1's`,
      await succeeds(payload, () =>
        payload.update({
          collection: slug,
          id: t1Doc,
          data: {},
          user: owner,
          overrideAccess: false,
          context,
        }),
      ),
    )
    check(
      `${slug}: owner@ cannot update tenant3's`,
      await isRefused(
        payload,
        () =>
          payload.update({
            collection: slug,
            id: t3Doc,
            data: {},
            user: owner,
            overrideAccess: false,
            context,
          }),
        [403, 404],
      ),
    )
    check(
      `${slug}: owner@ cannot delete tenant1's`,
      await isRefused(
        payload,
        () =>
          payload.delete({
            collection: slug,
            id: t1Doc,
            user: owner,
            overrideAccess: false,
            context,
          }),
        [403, 404],
      ),
    )
    check(
      `${slug}: owner@ cannot create one`,
      await isRefused(
        payload,
        () =>
          payload.create({
            collection: slug,
            // every field on these collections is optional; the tenant alone is a valid doc
            data: { tenant: t1.id },
            user: owner,
            overrideAccess: false,
            context,
          }),
        [400, 403],
      ),
    )
  }

  // editor1@ and cashier2@: their profile, their tenant
  const pagesIn = async (user: SessionUser, tenant: Tenant): Promise<number> =>
    (
      await payload.count({
        collection: 'pages',
        where: { tenant: { equals: tenant.id } },
        user,
        overrideAccess: false,
      })
    ).totalDocs
  const homeOf = async (tenant: Tenant): Promise<number> => {
    const { docs } = await payload.find({
      collection: 'pages',
      where: { and: [{ tenant: { equals: tenant.id } }, { slug: { equals: 'home' } }] },
      limit: 1,
      depth: 0,
    })
    if (!docs[0]) throw new Error(`verify: no home page for ${tenant.slug}`)
    return docs[0].id
  }
  const editPage = (user: SessionUser, id: number) => () =>
    payload.update({ collection: 'pages', id, data: {}, user, overrideAccess: false, context })
  check(
    'editor1@: edits a tenant1 page',
    await succeeds(payload, editPage(editor1, await homeOf(t1))),
  )
  check(
    'editor1@: cannot edit a tenant2 page',
    await isRefused(payload, editPage(editor1, await homeOf(t2)), [403, 404]),
  )
  check('cashier2@: reads tenant2 pages', (await pagesIn(cashier2, t2)) > 0)
  check(
    'cashier2@: cannot edit a tenant2 page',
    await isRefused(payload, editPage(cashier2, await homeOf(t2)), [403, 404]),
  )
  check(
    'cashier2@: cannot open tenant1 drafts or edit tenant1 pages',
    await isRefused(payload, editPage(cashier2, await homeOf(t1)), [403, 404]),
  )
} catch (err) {
  fail()
  payload.logger.error({ msg: 'verify: tenantAdmins crashed', err })
} finally {
  await cleanup()
  if (tenant1Id !== null && tenant1NameBefore !== null) {
    await payload.update({
      collection: 'tenants',
      id: tenant1Id,
      data: { name: tenant1NameBefore },
      locale: 'en',
      context,
    })
  }
}

if (failures() > 0) {
  payload.logger.error(`verify: tenantAdmins ${failures()} check(s) failed`)
  process.exit(1)
}
payload.logger.info('verify: tenantAdmins all checks passed')
process.exit(0)
