import type { CollectionBeforeValidateHook, Where } from 'payload'
import { parseCookies, ValidationError } from 'payload'

type TenantSlugCollection = 'pages' | 'posts' | 'categories'

type TenantValue = number | string | { id: number | string } | null | undefined

const toTenantId = (tenant: TenantValue): number | string | undefined => {
  if (!tenant) return undefined
  return typeof tenant === 'object' ? tenant.id : tenant
}

/**
 * Friendly error for the `(tenant, slug)` unique index, instead of a raw db error.
 * The tenant comes from the data, the existing doc, or the admin's `payload-tenant` cookie
 * (the same fallback the multi-tenant plugin uses in its tenant field hook).
 */
export const validateTenantSlugUniqueness = (
  collection: TenantSlugCollection,
  label: string,
): CollectionBeforeValidateHook => {
  return async ({ data, req, originalDoc }) => {
    const slug = data?.slug
    if (!slug) return data

    const tenantId =
      toTenantId(data?.tenant) ??
      toTenantId(originalDoc?.tenant) ??
      parseCookies(req.headers).get('payload-tenant')

    if (!tenantId) return data

    const where: Where[] = [{ tenant: { equals: tenantId } }, { slug: { equals: slug } }]
    if (originalDoc?.id) {
      where.push({ id: { not_equals: originalDoc.id } })
    }

    // overrideAccess: uniqueness must hold across docs the current user can't read
    const existing = await req.payload.find({
      collection,
      where: { and: where },
      depth: 0,
      limit: 1,
      overrideAccess: true,
      req,
    })

    if (existing.totalDocs > 0) {
      throw new ValidationError({
        collection,
        errors: [
          {
            path: 'slug',
            message: `A ${label} with slug "${slug}" already exists in this business.`,
          },
        ],
        req,
      })
    }

    return data
  }
}
