/**
 * The form a public page shows: `/forms/<slug>` and the Form block inside pages. Every read is
 * filtered to the host's tenant and fails closed (unknown host, another tenant's form, an
 * inactive form → none). Takes the tenant id as an argument so tests need no Next.
 */
import type { Payload, TypedLocale } from 'payload'

import { frontendTenantWhere } from '@/common/utils/frontendTenant'
import { extractTenantId } from '@/common/utils/tenantCollections'
import type { Form } from '@/payload-types'

/**
 * The host tenant's form with `slug`, populated for the renderer, or `null`. `draft` (only while
 * previewing, `isPreviewing()`) reads the latest draft, as pages do.
 */
export const findFrontendForm = async (
  payload: Payload,
  tenantId: number | null,
  slug: string,
  { draft, locale }: { draft: boolean; locale: TypedLocale },
): Promise<Form | null> => {
  if (tenantId === null) return null

  // not previewing: the public read, published forms only
  const { docs } = await payload.find({
    collection: 'forms',
    where: frontendTenantWhere(tenantId, { slug: { equals: slug } }),
    draft,
    overrideAccess: draft,
    locale,
    depth: 1,
    limit: 1,
    pagination: false,
  })
  const form = docs[0]
  if (!form || form.isActive === false) {
    payload.logger.debug({
      msg: 'frontend form not shown',
      slug,
      tenantId,
      reason: form ? 'inactive' : 'not_found',
    })
    return null
  }
  return form
}

/**
 * Whether a form a page's block points at may render on this host: a populated form of the host's
 * tenant that is active. A page can't link another tenant's form (validateSameTenant), but an
 * old page could; the block then renders nothing instead of a form that always refuses.
 */
export const isFormForTenant = (
  form: number | Form | null | undefined,
  tenantId: number | null,
): form is Form => {
  if (!form || typeof form !== 'object' || tenantId === null) return false
  return extractTenantId(form.tenant) === tenantId && form.isActive !== false
}
