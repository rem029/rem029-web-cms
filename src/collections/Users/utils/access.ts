import type { Access, FieldAccess, Where } from 'payload'
import {
  NOT_SUPER_USER,
  getTenantRows,
  isActiveSuperUser,
  isAnyTenantAdmin,
  isDisabledUser,
  tenantAdminTenantIds,
} from '@/common/utils/access'

/**
 * Read access for users collection:
 * - Active super users read all users
 * - Tenant admins read themselves plus members with a row in any tenant they administer
 * - Everyone else reads themselves plus colleagues who share a tenant with them (not super users)
 */
export const readUsers: Access = ({ req }) => {
  const { user } = req
  if (!user || isDisabledUser(user)) return false
  if (isActiveSuperUser(user)) return true

  const selfWhere: Where = { id: { equals: user.id } }
  const adminIds = tenantAdminTenantIds(user)
  // colleagues of every tenant the user belongs to, for the "Visible to" picker (phase 6)
  const memberIds = [...new Set(getTenantRows(user).map((row) => row.tenantId))]
  if (memberIds.length === 0) return selfWhere

  const branches: Where[] = [
    selfWhere,
    { and: [{ 'tenants.tenant': { in: memberIds } }, NOT_SUPER_USER] },
  ]
  // tenant admins also read super users with a row in their tenants (phase 5)
  if (adminIds.length > 0) branches.push({ 'tenants.tenant': { in: adminIds } })
  return { or: branches }
}

/**
 * Update access for users collection:
 * - Active super users update all users
 * - Tenant admins update themselves and non-super-user members in their administered tenants
 * - Other users update only themselves
 */
export const updateUsers: Access = ({ req }) => {
  const { user } = req
  if (!user || isDisabledUser(user)) return false
  if (isActiveSuperUser(user)) return true

  const a = tenantAdminTenantIds(user)
  const selfWhere: Where = { id: { equals: user.id } }
  if (a.length === 0) {
    return selfWhere
  }

  const result: Where = {
    or: [selfWhere, { and: [{ 'tenants.tenant': { in: a } }, NOT_SUPER_USER] }],
  }
  return result
}

/**
 * Create access for users collection:
 * - Active super users can create users
 * - Any tenant admin can create users
 */
export const createUsers: Access = ({ req }) => {
  const { user } = req
  if (!user || isDisabledUser(user)) return false
  if (isActiveSuperUser(user)) return true

  return isAnyTenantAdmin(user)
}

/**
 * Delete access for users collection:
 * - Active super users can delete users (protectLastSuperUser handles last super user)
 * - Tenant admins can delete non-super users in their administered tenants (except themselves)
 */
export const deleteUsers: Access = ({ req }) => {
  const { user } = req
  if (!user || isDisabledUser(user)) return false
  if (isActiveSuperUser(user)) return true

  const a = tenantAdminTenantIds(user)
  if (a.length === 0) return false

  return {
    and: [{ 'tenants.tenant': { in: a } }, NOT_SUPER_USER, { id: { not_equals: user.id } }],
  }
}

/**
 * Field access for user email creation:
 * - Super users or any tenant admin can set email on user creation
 */
export const canCreateUserEmail: FieldAccess = ({ req }) => {
  const { user } = req
  if (!user || isDisabledUser(user)) return false
  if (isActiveSuperUser(user)) return true

  return isAnyTenantAdmin(user)
}

/**
 * Field access for the password, applied through the `password` field override the admin reads
 * to show "Change Password". Tenant admins set a password only when creating a user: a user can
 * belong to other tenants (`guardSensitiveFields` refuses it server-side too).
 *
 * create is only true before the doc exists and update only after: Payload collapses a field's
 * permissions to `true` when all of them are true, and its auth UI then hides the password
 * fields (it expects an object). Splitting them keeps the permissions an object.
 */
export const canCreatePassword: FieldAccess = ({ req, id }) => {
  const { user } = req
  if (id !== undefined || !user || isDisabledUser(user)) return false
  return isActiveSuperUser(user) || isAnyTenantAdmin(user)
}

/** update of a field only the user themselves (or a super user) may change: password, name */
export const isSelfOrSuperUserField: FieldAccess = ({ req, id }) => {
  const { user } = req
  if (id === undefined || !user || isDisabledUser(user)) return false
  return isActiveSuperUser(user) || String(id) === String(user.id)
}
