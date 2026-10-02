import type { CollectionBeforeChangeHook } from 'payload'
import { Forbidden, parseCookies } from 'payload'

type TenantValue = number | string | { id: number | string } | null | undefined

const toTenantId = (tenant: TenantValue): number | string | undefined => {
  if (!tenant) return undefined
  return typeof tenant === 'object' ? tenant.id : tenant
}

/**
 * The multi-tenant plugin limits access with a `where` on the doc's tenant, which Payload
 * can't apply to creates or to changing a doc's tenant. This blocks writing a doc into a
 * tenant the user isn't a member of. Anonymous writes (e.g. form submissions) are left to
 * the collection's own access and hooks.
 */
export const enforceTenantMembership: CollectionBeforeChangeHook = ({
  collection,
  data,
  operation,
  originalDoc,
  req,
}) => {
  const { user } = req
  if (!user || user.super_user) return data

  // create: same fallback as the plugin's tenant field hook (value, then the admin's cookie).
  // update: an omitted tenant keeps the stored one, so check that, not the cookie.
  const tenantId =
    toTenantId(data?.tenant) ??
    (operation === 'create'
      ? parseCookies(req.headers).get('payload-tenant')
      : toTenantId(originalDoc?.tenant))

  // a missing tenant is rejected by the plugin's tenant field hook
  if (!tenantId) return data

  const isMember = (user.tenants ?? []).some(
    (row) => String(toTenantId(row.tenant)) === String(tenantId),
  )

  if (!isMember) {
    req.payload.logger.warn({
      msg: 'Blocked write to a tenant the user is not a member of',
      collection: collection.slug,
      operation,
      tenantId,
      userId: user.id,
    })
    throw new Forbidden(req.t)
  }

  return data
}
