/**
 * Access profiles (`users-access`) for testing: `editor` and `viewer`.
 *
 *   pnpm seed
 *
 * - Upserts by slug, so re-running converges on the definitions below.
 * - Every collection gets an explicit row; anything not granted here is hidden and denied.
 * - Not assigned to any user yet: access checks aren't wired to profiles until rem0001 phase 2.
 */
import type { Payload } from 'payload'

import { getAccessSlugs } from '@/collections/UsersAccess/utils/accessSlugs'
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

const upsertProfile = async (payload: Payload, profile: Profile, slugs: string[]) => {
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
    await payload.update({ collection: 'users-access', id: docs[0].id, data })
    payload.logger.info(`seed: updated access profile ${profile.slug}`)
    return
  }

  await payload.create({ collection: 'users-access', data })
  payload.logger.info(`seed: created access profile ${profile.slug}`)
}

export const seedAccess = async (payload: Payload): Promise<void> => {
  const slugs = getAccessSlugs(payload.config.collections)
  for (const profile of PROFILES) {
    await upsertProfile(payload, profile, slugs)
  }
}
