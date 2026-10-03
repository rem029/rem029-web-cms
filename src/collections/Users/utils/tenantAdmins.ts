import type { PayloadRequest, Where } from 'payload'
import { extractTenantId } from '@/common/utils/tenantCollections'
import { isDisabledUser } from '@/common/utils/access'

const isRecord = (val: unknown): val is Record<string, unknown> =>
  typeof val === 'object' && val !== null

/**
 * Counts other active (non-disabled) users who are tenant admins for the given tenantId,
 * excluding the targetId.
 * Since Payload array where queries can match 'tenant' and 'isTenantAdmin' across different rows,
 * we verify the row-level match in code.
 */
export const countOtherTenantAdmins = async (
  req: PayloadRequest,
  tenantId: number,
  targetId?: number | string | null,
): Promise<number> => {
  const whereConditions: Where[] = [
    { 'tenants.tenant': { equals: tenantId } },
    { 'tenants.isTenantAdmin': { equals: true } },
  ]
  if (targetId !== undefined && targetId !== null) {
    whereConditions.push({ id: { not_equals: targetId } })
  }

  const { docs } = await req.payload.find({
    collection: 'users',
    where: {
      and: whereConditions,
    },
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })

  let count = 0
  for (const user of docs) {
    if (isDisabledUser(user)) continue
    if (!user.tenants || !Array.isArray(user.tenants)) continue

    const hasMatchingAdminRow = user.tenants.some((row) => {
      if (!isRecord(row)) return false
      const rowTenantId = extractTenantId(row.tenant)
      const isAdmin = 'isTenantAdmin' in row && row.isTenantAdmin === true
      return rowTenantId === tenantId && isAdmin
    })

    if (hasMatchingAdminRow) {
      count++
    }
  }

  return count
}
