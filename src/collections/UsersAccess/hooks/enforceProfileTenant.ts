import type { CollectionBeforeChangeHook } from 'payload'
import { Forbidden } from 'payload'
import { isActiveSuperUser } from '@/common/utils/access'
import { extractTenantId } from '@/common/utils/tenantCollections'
import { getSelectedTenant } from '@/common/utils/getSelectedTenant'
import { managedProfileTenantIds } from '@/collections/UsersAccess/utils/access'

/**
 * Enforces that non-super users (tenant admins) only create or update profiles
 * within tenants they manage (excluding the platform admin tenant).
 * Also prevents moving a profile to an unmanaged or platform tenant.
 */
export const enforceProfileTenant: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  const { user } = req
  if (!user || isActiveSuperUser(user)) {
    return data
  }

  const targetTenantId =
    extractTenantId(data?.tenant) ??
    (operation === 'create' ? getSelectedTenant(req) : extractTenantId(originalDoc?.tenant))

  const managedIds = await managedProfileTenantIds(req)

  if (targetTenantId === null || !managedIds.includes(targetTenantId)) {
    req.payload.logger.warn({
      msg: 'Blocked unauthorized profile write to tenant',
      userId: user.id,
      tenantId: targetTenantId,
      profileId: originalDoc?.id,
      operation,
    })
    throw new Forbidden(req.t)
  }

  return data
}
