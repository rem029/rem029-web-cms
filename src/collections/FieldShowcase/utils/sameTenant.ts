import type { FilterOptions } from 'payload'

import { extractTenantId } from '@/common/utils/tenantCollections'

/**
 * Relationship/upload pickers of the showcase list only docs of the doc's own tenant. Payload also
 * checks a saved value against this server-side, so a parent from another tenant is refused.
 */
export const sameTenant: FilterOptions = ({ data }) => {
  const tenantId = extractTenantId(data?.tenant)
  // nothing to pick until the doc has a tenant
  if (tenantId === null) return false
  return { tenant: { equals: tenantId } }
}
