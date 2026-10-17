/** Tenants as tests use them. */
import type { Payload } from 'payload'

import type { Tenant } from '@/payload-types'

/** A tenant by slug (a test fixture or `admin`); throws when missing. */
export const findTenant = async (payload: Payload, slug: string): Promise<Tenant> => {
  const { docs } = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: slug } },
    depth: 0,
    limit: 1,
  })
  if (!docs[0]) {
    throw new Error(`tests: no tenant ${slug}`)
  }
  return docs[0]
}
