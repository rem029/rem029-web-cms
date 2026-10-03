import type { Access, PayloadRequest, Where } from 'payload'
import { DEFAULT_ACCESS_SLUG } from '@/collections/UsersAccess/utils/defaultProfile'
import { DEFAULT_TENANT_SLUG } from '@/common/utils/defaultTenant'
import { isActiveSuperUser, isDisabledUser, tenantAdminTenantIds } from '@/common/utils/access'
import { extractTenantId } from '@/common/utils/tenantCollections'
import { getSelectedTenant } from '@/common/utils/getSelectedTenant'
import { getAdminTenantId } from '@/common/utils/adminTenant'

/**
 * Filter that matches the platform default profile on the admin tenant.
 */
export const PLATFORM_DEFAULT_WHERE: Where = {
  and: [
    { slug: { equals: DEFAULT_ACCESS_SLUG } },
    { 'tenant.slug': { equals: DEFAULT_TENANT_SLUG } },
  ],
}

/**
 * Tenant IDs where the user is a tenant admin, excluding the platform admin tenant.
 * Profiles on the admin tenant are platform templates managed by super users only.
 */
export const managedProfileTenantIds = async (req: PayloadRequest): Promise<number[]> => {
  const { user } = req
  if (!user || isDisabledUser(user)) return []

  const adminIds = tenantAdminTenantIds(user)
  if (adminIds.length === 0) return []

  const adminTenantId = await getAdminTenantId(req)
  if (adminTenantId === null) return adminIds

  return adminIds.filter((id) => id !== adminTenantId)
}

/**
 * Read access for access profiles:
 * - Super users read all profiles
 * - Tenant admins read profiles in their administered tenants, plus the platform default profile
 */
export const readProfiles: Access = ({ req }) => {
  const { user } = req
  if (!user || isDisabledUser(user)) return false
  if (isActiveSuperUser(user)) return true

  const ids = tenantAdminTenantIds(user)
  if (ids.length === 0) {
    req.payload.logger.debug({
      msg: 'access: denied',
      slug: 'users-access',
      op: 'read',
      userId: user.id,
    })
    return false
  }

  return {
    or: [{ tenant: { in: ids } }, PLATFORM_DEFAULT_WHERE],
  }
}

/**
 * Create access for access profiles:
 * - Super users can create profiles anywhere
 * - Tenant admins can only create profiles in their managed tenants (excluding admin tenant)
 */
export const createProfile: Access = async ({ req, data }) => {
  const { user } = req
  if (!user || isDisabledUser(user)) return false
  if (isActiveSuperUser(user)) return true

  const target = extractTenantId(data?.tenant) ?? getSelectedTenant(req)
  const managedIds = await managedProfileTenantIds(req)

  if (target !== null && managedIds.includes(target)) {
    return true
  }

  req.payload.logger.debug({
    msg: 'access: denied',
    slug: 'users-access',
    op: 'create',
    userId: user.id,
    tenantId: target,
  })
  return false
}

/**
 * Update access for access profiles:
 * - Super users can update any profile
 * - Tenant admins can only update profiles in their managed tenants
 */
export const updateProfile: Access = async ({ req }) => {
  const { user } = req
  if (!user || isDisabledUser(user)) return false
  if (isActiveSuperUser(user)) return true

  const ids = await managedProfileTenantIds(req)
  if (ids.length === 0) {
    req.payload.logger.debug({
      msg: 'access: denied',
      slug: 'users-access',
      op: 'update',
      userId: user.id,
    })
    return false
  }

  return { tenant: { in: ids } }
}

/**
 * Delete access for access profiles:
 * - Super users can delete any profile
 * - Tenant admins can only delete profiles in their managed tenants
 */
export const deleteProfile: Access = async ({ req }) => {
  const { user } = req
  if (!user || isDisabledUser(user)) return false
  if (isActiveSuperUser(user)) return true

  const ids = await managedProfileTenantIds(req)
  if (ids.length === 0) {
    req.payload.logger.debug({
      msg: 'access: denied',
      slug: 'users-access',
      op: 'delete',
      userId: user.id,
    })
    return false
  }

  return { tenant: { in: ids } }
}
