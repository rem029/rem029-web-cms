/**
 * Access profiles (`users-access`) and test users: `default`, `editor`, and `viewer`.
 *
 *   pnpm seed
 *
 * - Upserts by slug (profiles) and email (users), so re-running converges on the definitions below.
 * - Every collection gets an explicit row; anything not granted here is hidden and denied.
 * - Test users belong to the default tenant (`admin`) and have password equal to their email.
 */
import type { Payload } from 'payload'

import { getAccessSlugs } from '@/collections/UsersAccess/utils/accessSlugs'
import { DEFAULT_ACCESS_SLUG } from '@/collections/UsersAccess/utils/defaultProfile'
import { DEFAULT_TENANT_SLUG } from '@/common/utils/defaultTenant'
import type { UsersAccess } from '@/payload-types'

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

const USERS = [
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

const upsertProfile = async (
  payload: Payload,
  profile: Profile,
  slugs: string[],
): Promise<number> => {
  const data = {
    name: profile.name,
    slug: profile.slug,
    description: profile.description,
    access: buildRows(slugs, profile.grants),
  }

  const { docs } = await payload.find({
    collection: 'users-access',
    where: { slug: { equals: profile.slug } },
    limit: 1,
    depth: 0,
  })

  if (docs[0]) {
    const updated = await payload.update({ collection: 'users-access', id: docs[0].id, data })
    payload.logger.info(`seed: updated access profile ${profile.slug}`)
    return updated.id
  }

  const created = await payload.create({ collection: 'users-access', data })
  payload.logger.info(`seed: created access profile ${profile.slug}`)
  return created.id
}

export const seedAccess = async (payload: Payload): Promise<void> => {
  const slugs = getAccessSlugs(payload.config.collections)
  const profileIdsBySlug = new Map<string, number>()
  for (const profile of PROFILES) {
    const id = await upsertProfile(payload, profile, slugs)
    profileIdsBySlug.set(profile.slug, id)
  }

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

    const tenants = [{ tenant: defaultTenant.id }]

    if (existingUsers[0]) {
      await payload.update({
        collection: 'users',
        id: existingUsers[0].id,
        data: {
          name: user.name,
          access: profileId,
          tenants,
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
          access: profileId,
          tenants,
        },
      })
      payload.logger.info(`seed: created user ${user.email}`)
    }
  }
}
