/** Access profiles as tests use them: in-memory records for the helpers, seeded ones by slug. */
import type { Payload } from 'payload'

import { extractTenantId } from '@/common/utils/tenantCollections'
import type { UsersAccess } from '@/payload-types'

import type { SessionUser } from './users'

export type AccessRow = NonNullable<UsersAccess['access']>[number]

/** A profile that exists only in memory. Unset columns are false, `hidden` true. */
export const makeRecord = (
  rows: (Partial<AccessRow> & Pick<AccessRow, 'slug'>)[],
): UsersAccess => ({
  id: 99999,
  name: 'memory-record',
  slug: 'memory-record',
  access: rows.map((row) => ({
    hidden: true,
    read: false,
    create: false,
    update: false,
    delete: false,
    admin: false,
    access: false,
    ...row,
  })),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

/** A profile by slug in one tenant (slugs are unique per tenant); throws when missing. */
export const findProfile = async (
  payload: Payload,
  slug: string,
  tenantId: number,
): Promise<UsersAccess> => {
  const { docs } = await payload.find({
    collection: 'users-access',
    where: {
      and: [{ slug: { equals: slug } }, { tenant: { equals: tenantId } }],
    },
    depth: 0,
    limit: 1,
  })
  if (!docs[0]) {
    throw new Error(`tests: no profile ${slug} in tenant ${tenantId}`)
  }
  return docs[0]
}

/** The slug of the profile on the user's row for that tenant, null without a row or profile. */
export const profileSlugOn = (user: SessionUser, tenantId: number): string | null => {
  const row = (user.tenants ?? []).find((entry) => extractTenantId(entry.tenant) === tenantId)
  if (!row || !row.access || typeof row.access !== 'object') return null
  return row.access.slug
}
