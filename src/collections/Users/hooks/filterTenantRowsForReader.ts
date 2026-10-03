import type { FieldHook } from 'payload'
import { isActiveSuperUser, tenantAdminTenantIds } from '@/common/utils/access'
import { extractTenantId } from '@/common/utils/tenantCollections'

const isRecord = (val: unknown): val is Record<string, unknown> =>
  typeof val === 'object' && val !== null

/**
 * Filters out tenant rows of tenants the reader does not administer when reading other users.
 *
 * Skipped for:
 * - Internal reads with overrideAccess (originalDoc, findByID with overrideAccess, JWT lookup)
 * - Super users
 * - Self reads (the user viewing their own profile)
 *
 * NOTE: Saving a filtered user relies on guardTenantRows to merge back the stored rows
 * that were hidden from the admin form submission.
 */
export const filterTenantRowsForReader: FieldHook = ({ data, overrideAccess, req, value }) => {
  if (
    overrideAccess ||
    !req.user ||
    isActiveSuperUser(req.user) ||
    (data?.id !== undefined && String(data.id) === String(req.user.id)) ||
    !Array.isArray(value)
  ) {
    return value
  }

  const a = tenantAdminTenantIds(req.user)
  const filtered = value.filter((row) => {
    if (!isRecord(row)) return false
    const tenantId = extractTenantId(row.tenant)
    return tenantId !== null && a.includes(tenantId)
  })

  if (filtered.length < value.length) {
    req.payload.logger.debug({
      msg: 'Filtered out tenant rows reader does not administer',
      userId: req.user.id,
      targetId: data?.id,
      dropped: value.length - filtered.length,
    })
  }

  return filtered
}
