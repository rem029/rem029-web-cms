import type { FieldHook } from 'payload'
import { DEFAULT_TENANT_SLUG } from '@/common/utils/defaultTenant'
import { extractTenantId } from '@/common/utils/tenantCollections'

export const PLATFORM_LABEL = 'Platform (all businesses)'

/**
 * `afterRead` for an unstored `business` field: the doc's tenant name, so a list tells docs of
 * different businesses apart (profiles: "Editor" of tenant1 and tenant2; orders: #1 of each). Platform templates (on the `admin` tenant) read as
 * PLATFORM_LABEL; tenant admins can't read that tenant, so its name would show as "Untitled".
 */
export const businessLabel: FieldHook = async ({ collection, req, siblingData }) => {
  const tenantId = extractTenantId(siblingData?.tenant)
  if (tenantId === null) return null

  const tenant = await req.payload
    .findByID({ collection: 'tenants', id: tenantId, depth: 0, req, overrideAccess: true })
    .catch((err: unknown) => {
      req.payload.logger.warn({ msg: 'business label lookup failed', collection: collection?.slug, tenantId, err })
      return null
    })
  if (!tenant) return null
  return tenant.slug === DEFAULT_TENANT_SLUG ? PLATFORM_LABEL : tenant.name
}
