import type { CollectionBeforeValidateHook } from 'payload'
import { parseCookies, ValidationError } from 'payload'

type TenantDocCollection = 'header' | 'footer' | 'theme' | 'settings'

type TenantValue = number | string | { id: number | string } | null | undefined

const toTenantId = (tenant: TenantValue): number | string | undefined => {
  if (!tenant) return undefined
  return typeof tenant === 'object' ? tenant.id : tenant
}

/**
 * Ensures only one document per tenant exists for tenant-scoped singleton collections
 * (header, footer, theme, settings). Throws a clear ValidationError if the tenant already has one.
 */
export const validateTenantDocUniqueness = (
  collection: TenantDocCollection,
  label: string,
): CollectionBeforeValidateHook => {
  return async ({ data, req, operation }) => {
    if (operation !== 'create') return data

    const tenantId = toTenantId(data?.tenant) ?? parseCookies(req.headers).get('payload-tenant')

    if (!tenantId) return data

    const existing = await req.payload.find({
      collection,
      where: { tenant: { equals: tenantId } },
      depth: 0,
      limit: 1,
      overrideAccess: true,
      req,
    })

    if (existing.totalDocs > 0) {
      req.payload.logger.warn({
        msg: `${label} already exists for this business`,
        slug: collection,
        tenantId,
        userId: req.user?.id,
      })
      throw new ValidationError({
        collection,
        errors: [
          {
            path: 'tenant',
            message: `${label} already exists for this business`,
          },
        ],
        req,
      })
    }

    return data
  }
}
