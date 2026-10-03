import type { PayloadRequest } from 'payload'
import { DEFAULT_TENANT_SLUG } from '@/common/utils/defaultTenant'

/**
 * Returns the tenant ID of the platform admin tenant (slug 'admin').
 * Used for platform templates and super-user-only profiles.
 * Warns if the admin tenant record is not found.
 */
export const getAdminTenantId = async (req: PayloadRequest): Promise<number | null> => {
  const { docs } = await req.payload.find({
    collection: 'tenants',
    where: { slug: { equals: DEFAULT_TENANT_SLUG } },
    depth: 0,
    limit: 1,
    req,
    overrideAccess: true,
  })

  const adminTenant = docs[0]
  if (!adminTenant || typeof adminTenant.id !== 'number') {
    req.payload.logger.warn({
      msg: 'Admin tenant not found',
      slug: DEFAULT_TENANT_SLUG,
    })
    return null
  }

  return adminTenant.id
}
