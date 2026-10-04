import type { PayloadRequest } from 'payload'
import { parseCookies } from 'payload'
import type { User } from '@/payload-types'
import { isActiveSuperUser, isDisabledUser } from '@/common/utils/access'
import { extractTenantId } from '@/common/utils/tenantCollections'

/**
 * Pure check: returns true if the user is an active super user or has a row
 * in user.tenants for that tenant ID.
 */
export const isUserAllowedTenant = (user: User | null | undefined, tenantId: number): boolean => {
  if (!user || isDisabledUser(user)) return false
  if (isActiveSuperUser(user)) return true
  return (user.tenants ?? []).some((row) => extractTenantId(row.tenant) === tenantId)
}

/**
 * Resolves the tenant id from a cookie value if it is an integer and allowed for the user.
 */
export const resolveTenantIdFromCookie = (
  cookie: string | null | undefined,
  user: User | null | undefined,
): number | null => {
  if (!cookie) return null
  const tenantId = Number(cookie)
  if (Number.isNaN(tenantId) || !Number.isInteger(tenantId)) {
    return null
  }
  return isUserAllowedTenant(user, tenantId) ? tenantId : null
}

/**
 * Returns the tenant id from the `payload-tenant` cookie if the user is an active super user
 * or has a row for that tenant in `user.tenants[]`. Otherwise returns null and logs a warning.
 */
export const getSelectedTenant = (req: PayloadRequest): number | null => {
  const cookie = parseCookies(req.headers).get('payload-tenant')
  if (!cookie) return null

  const tenantId = Number(cookie)
  if (Number.isNaN(tenantId) || !Number.isInteger(tenantId)) {
    req.payload.logger.warn({
      msg: 'access: invalid payload-tenant cookie (not an integer)',
      userId: req.user?.id,
      tenantId,
    })
    return null
  }

  const { user } = req
  if (!isUserAllowedTenant(user, tenantId)) {
    req.payload.logger.warn({
      msg: 'access: user is not a member of the selected tenant in payload-tenant cookie',
      userId: user?.id,
      tenantId,
    })
    return null
  }

  return tenantId
}
