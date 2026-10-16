/**
 * The `editor` profile in each test business: CRUD on pages, posts, media, categories;
 * read/update on header and footer; opens /admin. Every other slug is hidden and denied.
 */
import type { Payload } from 'payload'

import { getAccessSlugs } from '@/collections/UsersAccess/utils/accessSlugs'
import type { UsersAccess } from '@/payload-types'

import { TEST_PROFILE, TEST_TENANTS, type TenantIds } from './fixtures'

type AccessRow = NonNullable<UsersAccess['access']>[number]
type Grant = Partial<Omit<AccessRow, 'id' | 'slug'>>

const CRUD: Grant = { hidden: false, read: true, create: true, update: true, delete: true }
const READ_UPDATE: Grant = { hidden: false, read: true, update: true }
const OPEN_ADMIN: Grant = { hidden: true, admin: true }

const EDITOR_GRANTS: Partial<Record<AccessRow['slug'], Grant>> = {
  pages: CRUD,
  posts: CRUD,
  media: CRUD,
  categories: CRUD,
  header: READ_UPDATE,
  footer: READ_UPDATE,
  users: OPEN_ADMIN,
}

// getAccessSlugs returns string[] built from the config; the generated slug union can't be
// derived from it at compile time (same cast as src/seeds/access.ts)
const buildEditorRows = (slugs: string[]): AccessRow[] =>
  slugs.map((slug) => ({
    slug: slug as AccessRow['slug'],
    hidden: true,
    read: false,
    create: false,
    update: false,
    delete: false,
    admin: false,
    access: false,
    ...EDITOR_GRANTS[slug as AccessRow['slug']],
  }))

const upsertEditorProfile = async (
  payload: Payload,
  tenantId: number,
  tenantSlug: string,
  slugs: string[],
): Promise<number> => {
  const { docs } = await payload.find({
    collection: 'users-access',
    where: { and: [{ slug: { equals: TEST_PROFILE } }, { tenant: { equals: tenantId } }] },
    limit: 1,
    depth: 0,
  })

  const data = {
    name: 'Editor',
    slug: TEST_PROFILE,
    description: 'Edits pages, posts, media and categories of this business.',
    tenant: tenantId,
    access: buildEditorRows(slugs),
  }

  if (docs[0]) {
    const updated = await payload.update({
      collection: 'users-access',
      id: docs[0].id,
      data,
    })
    payload.logger.info(`test seed: updated profile ${tenantSlug}/${TEST_PROFILE}`)
    return updated.id
  }

  const created = await payload.create({
    collection: 'users-access',
    data,
  })
  payload.logger.info(`test seed: created profile ${tenantSlug}/${TEST_PROFILE}`)
  return created.id
}

/** The editor profile's id per business. */
export const seedTestProfiles = async (
  payload: Payload,
  tenants: TenantIds,
): Promise<TenantIds> => {
  const slugs = getAccessSlugs(payload.config.collections)
  return {
    a: await upsertEditorProfile(payload, tenants.a, TEST_TENANTS.a, slugs),
    b: await upsertEditorProfile(payload, tenants.b, TEST_TENANTS.b, slugs),
  }
}
