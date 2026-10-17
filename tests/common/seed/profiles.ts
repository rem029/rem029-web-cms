/**
 * The profiles in each test business with members (test-a, test-b, test-inactive; `TEST_PROFILES`):
 * - `editor`: CRUD on pages, posts, media, categories, field-showcase; read/update on header and footer
 * - `viewer`: read on pages, posts, media, categories, field-showcase, header and footer
 * - `log-reader`: every box on audit-logs (only read and the nav count there)
 * Editor and viewer open /admin. Every other slug is hidden and denied.
 */
import type { Payload } from 'payload'

import { getAccessSlugs } from '@/collections/UsersAccess/utils/accessSlugs'
import type { UsersAccess } from '@/payload-types'

import { TEST_PROFILES, TEST_TENANTS, type ProfileIds, type TenantIds } from './fixtures'

type AccessRow = NonNullable<UsersAccess['access']>[number]
type Grant = Partial<Omit<AccessRow, 'id' | 'slug'>>
type Grants = Partial<Record<AccessRow['slug'], Grant>>

type ProfileSpec = {
  name: string
  slug: string
  description: string
  grants: Grants
}

const CRUD: Grant = { hidden: false, read: true, create: true, update: true, delete: true }
const READ_UPDATE: Grant = { hidden: false, read: true, update: true }
const READ: Grant = { hidden: false, read: true }
const OPEN_ADMIN: Grant = { hidden: true, admin: true }

const EDITOR: ProfileSpec = {
  name: 'Editor',
  slug: TEST_PROFILES.editor,
  description: 'Edits pages, posts, media and categories of this business.',
  grants: {
    pages: CRUD,
    posts: CRUD,
    media: CRUD,
    categories: CRUD,
    'field-showcase': CRUD,
    header: READ_UPDATE,
    footer: READ_UPDATE,
    users: OPEN_ADMIN,
  },
}

const VIEWER: ProfileSpec = {
  name: 'Viewer',
  slug: TEST_PROFILES.viewer,
  description: 'Reads the content of this business.',
  grants: {
    pages: READ,
    posts: READ,
    media: READ,
    categories: READ,
    'field-showcase': READ,
    header: READ,
    footer: READ,
    users: OPEN_ADMIN,
  },
}

const LOG_READER: ProfileSpec = {
  name: 'Log reader',
  slug: TEST_PROFILES.logReader,
  description: 'Reads the audit logs of this business.',
  grants: {
    'audit-logs': {
      hidden: false,
      read: true,
      create: true,
      update: true,
      delete: true,
      admin: true,
      access: true,
    },
  },
}

// getAccessSlugs returns string[] built from the config; the generated slug union can't be
// derived from it at compile time (same cast as src/seeds/access.ts)
const buildRows = (slugs: string[], grants: Grants): AccessRow[] =>
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
  tenantId: number,
  tenantSlug: string,
  spec: ProfileSpec,
  slugs: string[],
): Promise<number> => {
  const { docs } = await payload.find({
    collection: 'users-access',
    where: { and: [{ slug: { equals: spec.slug } }, { tenant: { equals: tenantId } }] },
    limit: 1,
    depth: 0,
  })

  const data = {
    name: spec.name,
    slug: spec.slug,
    description: spec.description,
    tenant: tenantId,
    access: buildRows(slugs, spec.grants),
  }

  if (docs[0]) {
    const updated = await payload.update({
      collection: 'users-access',
      id: docs[0].id,
      data,
    })
    payload.logger.info(`test seed: updated profile ${tenantSlug}/${spec.slug}`)
    return updated.id
  }

  const created = await payload.create({
    collection: 'users-access',
    data,
  })
  payload.logger.info(`test seed: created profile ${tenantSlug}/${spec.slug}`)
  return created.id
}

/** The editor, viewer and log reader profile ids per business. */
export const seedTestProfiles = async (
  payload: Payload,
  tenants: TenantIds,
): Promise<ProfileIds> => {
  const slugs = getAccessSlugs(payload.config.collections)
  return {
    editor: {
      a: await upsertProfile(payload, tenants.a, TEST_TENANTS.a, EDITOR, slugs),
      b: await upsertProfile(payload, tenants.b, TEST_TENANTS.b, EDITOR, slugs),
      inactive: await upsertProfile(
        payload,
        tenants.inactive,
        TEST_TENANTS.inactive,
        EDITOR,
        slugs,
      ),
    },
    viewer: {
      a: await upsertProfile(payload, tenants.a, TEST_TENANTS.a, VIEWER, slugs),
      b: await upsertProfile(payload, tenants.b, TEST_TENANTS.b, VIEWER, slugs),
      inactive: await upsertProfile(
        payload,
        tenants.inactive,
        TEST_TENANTS.inactive,
        VIEWER,
        slugs,
      ),
    },
    logReader: {
      a: await upsertProfile(payload, tenants.a, TEST_TENANTS.a, LOG_READER, slugs),
      b: await upsertProfile(payload, tenants.b, TEST_TENANTS.b, LOG_READER, slugs),
      inactive: await upsertProfile(
        payload,
        tenants.inactive,
        TEST_TENANTS.inactive,
        LOG_READER,
        slugs,
      ),
    },
  }
}
