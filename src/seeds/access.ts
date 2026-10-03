/**
 * Access profiles (`users-access`) and test users.
 *
 * - `seedAccess`: platform profiles `default`, `editor`, `viewer` on the `admin` tenant (platform
 *   templates since rem0001 phase 5) and test users of the default tenant.
 * - `seedTenantAccess` (runs after `multiTenancy`, which creates tenant1/tenant2): tenant-made
 *   `editor`/`cashier` profiles in tenant1 and tenant2, and `owner@` (tenant admin of both),
 *   `editor1@`/`editor2@`/`editor3@` (tenant1 editors), `cashier2@` (tenant2 cashier).
 *
 *   pnpm seed
 *
 * - Upserts by slug (profiles) and email (users), so re-running converges on the definitions below.
 * - Every collection gets an explicit row; anything not granted here is hidden and denied.
 * - Test users belong to the default tenant (`admin`), with their profile on that tenant row, and
 *   have password equal to their email. Users in several tenants are in `multiTenancy.ts`.
 */
import type { Payload } from 'payload'

import { getAccessSlugs } from '@/collections/UsersAccess/utils/accessSlugs'
import { DEFAULT_ACCESS_SLUG } from '@/collections/UsersAccess/utils/defaultProfile'
import { DEFAULT_TENANT_SLUG } from '@/common/utils/defaultTenant'
import type { Tenant, UsersAccess } from '@/payload-types'

type AccessRow = NonNullable<UsersAccess['access']>[number]
type Grant = Partial<Omit<AccessRow, 'id' | 'slug'>>

type Profile = {
  name: string
  slug: string
  description: string
  grants: Partial<Record<AccessRow['slug'], Grant>>
}

const CRUD: Grant = { hidden: false, read: true, create: true, update: true, delete: true }
const READ_UPDATE: Grant = { hidden: false, read: true, update: true }
const READ: Grant = { hidden: false, read: true }
// `users.admin` opens /admin; the users collection itself stays hidden
const OPEN_ADMIN: Grant = { hidden: true, admin: true }

const PROFILES: Profile[] = [
  {
    name: 'Default',
    slug: DEFAULT_ACCESS_SLUG,
    description: 'Default profile assigned to new users. Can open the admin panel.',
    grants: {
      users: OPEN_ADMIN,
    },
  },
  {
    name: 'Editor',
    slug: 'editor',
    description: 'Edits pages, posts, media and categories. Can open the admin panel.',
    grants: {
      pages: CRUD,
      posts: CRUD,
      media: CRUD,
      categories: CRUD,
      header: READ_UPDATE,
      footer: READ_UPDATE,
      users: OPEN_ADMIN,
    },
  },
  {
    name: 'Viewer',
    slug: 'viewer',
    description: 'Reads content. Can open the admin panel.',
    grants: {
      pages: READ,
      posts: READ,
      media: READ,
      categories: READ,
      header: READ,
      footer: READ,
      users: OPEN_ADMIN,
    },
  },
]

const USERS: { name: string; email: string; profileSlug: string; isDisabled?: boolean }[] = [
  {
    name: 'Default User',
    email: 'default@example.test',
    profileSlug: DEFAULT_ACCESS_SLUG,
  },
  {
    name: 'Editor User',
    email: 'editor@example.test',
    profileSlug: 'editor',
  },
  {
    name: 'Viewer User',
    email: 'viewer@example.test',
    profileSlug: 'viewer',
  },
  {
    // can't log in; an open session gets no access
    name: 'Disabled User',
    email: 'disabled@example.test',
    profileSlug: 'editor',
    isDisabled: true,
  },
]

const buildRows = (slugs: string[], grants: Profile['grants']): AccessRow[] =>
  slugs.map((slug) => ({
    slug: slug as AccessRow['slug'],
    hidden: true,
    read: false,
    create: false,
    update: false,
    delete: false,
    admin: false,
    access: false,
    ...grants[slug as AccessRow['slug']],
  }))

// slugs are unique per tenant (rem0001 phase 5), so a profile is found by tenant + slug
const upsertProfile = async (
  payload: Payload,
  profile: Profile,
  slugs: string[],
  tenant: Tenant,
): Promise<number> => {
  const data = {
    name: profile.name,
    slug: profile.slug,
    description: profile.description,
    tenant: tenant.id,
    access: buildRows(slugs, profile.grants),
  }

  const { docs } = await payload.find({
    collection: 'users-access',
    where: { and: [{ slug: { equals: profile.slug } }, { tenant: { equals: tenant.id } }] },
    limit: 1,
    depth: 0,
  })

  if (docs[0]) {
    const updated = await payload.update({ collection: 'users-access', id: docs[0].id, data })
    payload.logger.info(`seed: updated access profile ${tenant.slug}/${profile.slug}`)
    return updated.id
  }

  const created = await payload.create({ collection: 'users-access', data })
  payload.logger.info(`seed: created access profile ${tenant.slug}/${profile.slug}`)
  return created.id
}

export const seedAccess = async (payload: Payload): Promise<void> => {
  const slugs = getAccessSlugs(payload.config.collections)
  const { docs: defaultTenants } = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: DEFAULT_TENANT_SLUG } },
    limit: 1,
    depth: 0,
  })
  const defaultTenant = defaultTenants[0]
  if (!defaultTenant) {
    throw new Error(
      `seed: default tenant "${DEFAULT_TENANT_SLUG}" not found; run defaultAdmin / migrations first`,
    )
  }

  const profileIdsBySlug = new Map<string, number>()
  for (const profile of PROFILES) {
    const id = await upsertProfile(payload, profile, slugs, defaultTenant)
    profileIdsBySlug.set(profile.slug, id)
  }

  for (const user of USERS) {
    const profileId = profileIdsBySlug.get(user.profileSlug)
    if (!profileId) {
      throw new Error(`seed: profile "${user.profileSlug}" not found for user "${user.email}"`)
    }

    const { docs: existingUsers } = await payload.find({
      collection: 'users',
      where: { email: { equals: user.email } },
      limit: 1,
      depth: 0,
    })

    // the profile lives on the tenant row (rem0001 phase 4)
    const tenants = [{ tenant: defaultTenant.id, access: profileId }]
    const is_disabled = user.isDisabled === true

    if (existingUsers[0]) {
      await payload.update({
        collection: 'users',
        id: existingUsers[0].id,
        data: {
          name: user.name,
          tenants,
          is_disabled,
        },
      })
      payload.logger.info(`seed: updated user ${user.email}`)
    } else {
      await payload.create({
        collection: 'users',
        data: {
          email: user.email,
          name: user.name,
          password: user.email,
          tenants,
          is_disabled,
        },
      })
      payload.logger.info(`seed: created user ${user.email}`)
    }
  }
}

// tenant-made profiles: what a tenant admin would create in their own business
const TENANT_PROFILES: Profile[] = [
  {
    name: 'Editor',
    slug: 'editor',
    description: 'Edits pages, posts, media and categories of this business.',
    grants: PROFILES.find((profile) => profile.slug === 'editor')?.grants ?? {},
  },
  {
    // POS permissions come with the POS task
    name: 'Cashier',
    slug: 'cashier',
    description: 'Reads pages, posts, media and categories. Can open the admin panel.',
    grants: {
      pages: READ,
      posts: READ,
      media: READ,
      categories: READ,
      users: OPEN_ADMIN,
    },
  },
]
const TENANT_PROFILE_TENANTS = ['tenant1', 'tenant2']

type TenantSeedUser = {
  name: string
  email: string
  // profileSlug is a profile of that tenant (TENANT_PROFILES); omitted for tenant admins
  memberships: { tenantSlug: string; profileSlug?: string; isTenantAdmin?: boolean }[]
}

const TENANT_USERS: TenantSeedUser[] = [
  {
    name: 'Owner of tenant1 + tenant2',
    email: 'owner@example.test',
    memberships: [
      { tenantSlug: 'tenant1', isTenantAdmin: true },
      { tenantSlug: 'tenant2', isTenantAdmin: true },
    ],
  },
  {
    name: 'tenant1 editor (tenant profile)',
    email: 'editor1@example.test',
    memberships: [{ tenantSlug: 'tenant1', profileSlug: 'editor' }],
  },
  // hidden documents (hiddenDocuments.ts): editor2@ is in the hidden page's "Visible to",
  // editor3@ isn't
  {
    name: 'tenant1 editor 2',
    email: 'editor2@example.test',
    memberships: [{ tenantSlug: 'tenant1', profileSlug: 'editor' }],
  },
  {
    name: 'tenant1 editor 3',
    email: 'editor3@example.test',
    memberships: [{ tenantSlug: 'tenant1', profileSlug: 'editor' }],
  },
  {
    name: 'tenant2 cashier',
    email: 'cashier2@example.test',
    memberships: [{ tenantSlug: 'tenant2', profileSlug: 'cashier' }],
  },
]

export const seedTenantAccess = async (payload: Payload): Promise<void> => {
  // the first user becomes the super user (setupFirstUser), so that must be a real person
  if ((await payload.count({ collection: 'users' })).totalDocs === 0) {
    payload.logger.warn('seed: no users yet, skipping tenant access. create your account first')
    return
  }

  const slugs = getAccessSlugs(payload.config.collections)
  const { docs: tenants } = await payload.find({
    collection: 'tenants',
    where: { slug: { in: TENANT_PROFILE_TENANTS } },
    limit: TENANT_PROFILE_TENANTS.length,
    depth: 0,
  })
  const tenantsBySlug = new Map(tenants.map((tenant) => [tenant.slug, tenant]))

  // `${tenantSlug}/${profileSlug}` → id
  const profileIds = new Map<string, number>()
  for (const tenantSlug of TENANT_PROFILE_TENANTS) {
    const tenant = tenantsBySlug.get(tenantSlug)
    if (!tenant) throw new Error(`seed: tenant "${tenantSlug}" not found; run multiTenancy first`)
    for (const profile of TENANT_PROFILES) {
      const id = await upsertProfile(payload, profile, slugs, tenant)
      profileIds.set(`${tenantSlug}/${profile.slug}`, id)
    }
  }

  for (const user of TENANT_USERS) {
    const rows = user.memberships.map(({ tenantSlug, profileSlug, isTenantAdmin }) => {
      const tenant = tenantsBySlug.get(tenantSlug)
      if (!tenant) throw new Error(`seed: tenant "${tenantSlug}" missing for ${user.email}`)
      const access = profileSlug ? profileIds.get(`${tenantSlug}/${profileSlug}`) : undefined
      if (profileSlug && !access) {
        throw new Error(`seed: profile "${tenantSlug}/${profileSlug}" missing for ${user.email}`)
      }
      // a tenant admin row without a profile gets `default` from assignDefaultAccess
      return { tenant: tenant.id, access: access ?? null, isTenantAdmin: isTenantAdmin === true }
    })

    const { docs } = await payload.find({
      collection: 'users',
      where: { email: { equals: user.email } },
      limit: 1,
      depth: 0,
    })
    if (docs[0]) {
      await payload.update({
        collection: 'users',
        id: docs[0].id,
        data: { name: user.name, password: user.email, tenants: rows },
      })
      payload.logger.info(`seed: reset password and memberships of ${user.email}`)
      continue
    }

    await payload.create({
      collection: 'users',
      data: { email: user.email, name: user.name, password: user.email, tenants: rows },
    })
    payload.logger.info(`seed: created user ${user.email}`)
  }
}
