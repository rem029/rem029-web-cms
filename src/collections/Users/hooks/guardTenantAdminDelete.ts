import type { CollectionBeforeDeleteHook } from 'payload'
import { Forbidden } from 'payload'
import { isActiveSuperUser, tenantAdminTenantIds } from '@/common/utils/access'
import { extractTenantId } from '@/common/utils/tenantCollections'
import { countOtherTenantAdmins } from '@/collections/Users/utils/tenantAdmins'

const isRecord = (val: unknown): val is Record<string, unknown> =>
  typeof val === 'object' && val !== null

/**
 * Enforces deletion constraints for tenant admins:
 * - Cannot delete self
 * - Cannot delete super users
 * - Cannot delete users who have membership rows in tenants the actor does not administer
 *   (they must remove the user's row in their own tenant instead)
 * - Cannot delete the last tenant admin of any tenant
 */
export const guardTenantAdminDelete: CollectionBeforeDeleteHook = async ({ req, id }) => {
  if (!req.user || isActiveSuperUser(req.user)) {
    return
  }

  if (String(id) === String(req.user.id)) {
    req.payload.logger.warn({
      msg: 'Tenant admin attempted to delete self',
      userId: req.user.id,
      targetId: id,
    })
    throw new Forbidden(req.t)
  }

  const target = await req.payload.findByID({
    collection: 'users',
    id,
    depth: 0,
    req,
    overrideAccess: true,
  })

  if (!target) {
    return
  }

  if (target.super_user) {
    req.payload.logger.warn({
      msg: 'Tenant admin attempted to delete a super user',
      userId: req.user.id,
      targetId: id,
    })
    throw new Forbidden(req.t)
  }

  const a = tenantAdminTenantIds(req.user)
  const targetTenants = Array.isArray(target.tenants) ? target.tenants : []

  for (const row of targetTenants) {
    if (!isRecord(row)) continue
    const tenantId = extractTenantId(row.tenant)
    if (tenantId === null) continue

    if (!a.includes(tenantId)) {
      req.payload.logger.warn({
        msg: 'Refused deleting a user who belongs to another tenant; remove their row instead',
        userId: req.user.id,
        targetId: id,
        tenantId,
      })
      throw new Forbidden(req.t)
    }
  }

  for (const row of targetTenants) {
    if (!isRecord(row)) continue
    const tenantId = extractTenantId(row.tenant)
    if (tenantId === null) continue

    if (row.isTenantAdmin === true) {
      const otherCount = await countOtherTenantAdmins(req, tenantId, target.id)
      if (otherCount === 0) {
        req.payload.logger.warn({
          msg: 'Refused deleting the last tenant admin',
          userId: req.user.id,
          targetId: id,
          tenantId,
        })
        throw new Forbidden(req.t)
      }
    }
  }
}
