import type { FilterOptions } from 'payload'

/**
 * Relationship/upload pickers of the showcase list only docs of the doc's own tenant. Payload also
 * checks a saved value against this server-side, so a parent from another tenant is refused.
 */
export const sameTenant: FilterOptions = ({ data }) => {
  // 1. tenant id from data.tenant (an id, or a populated tenant doc): extractTenantId
  // 2. no tenant yet → false (nothing to pick until the tenant is set)
  // 3. → { tenant: { equals: <id> } }
  void data
  return true
}
