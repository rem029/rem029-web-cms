import type { PayloadRequest } from 'payload'
import { parseCookies } from 'payload'
import { isActiveSuperUser, isDisabledUser } from '@/common/utils/access'
import { extractTenantId } from '@/common/utils/tenantCollections'

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
  if (!user || isDisabledUser(user)) {
    req.payload.logger.warn({
      msg: 'access: user is not a member of the selected tenant in payload-tenant cookie',
      userId: user?.id,
      tenantId,
    })
    return null
  }

  if (isActiveSuperUser(user)) {
    return tenantId
  }

  const isMember = (user.tenants ?? []).some(
    (row) => extractTenantId(row.tenant) === tenantId,
  )

  if (!isMember) {
    req.payload.logger.warn({
      msg: 'access: user is not a member of the selected tenant in payload-tenant cookie',
      userId: user.id,
      tenantId,
    })
    return null
  }

  return tenantId
}
