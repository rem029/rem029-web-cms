/**
 * The form a public page shows: `/forms/<slug>` and the Form block inside pages. Every read is
 * filtered to the host's tenant and fails closed (unknown host, another tenant's form, an
 * inactive form → none). Takes the tenant id as an argument so tests need no Next.
 */
import type { Payload, TypedLocale } from 'payload'

import type { Form } from '@/payload-types'

/**
 * The host tenant's form with `slug`, populated for the renderer, or `null`. `draft` (only while
 * previewing, `isPreviewing()`) reads the latest draft, as pages do.
 */
export const findFrontendForm = async (
  _payload: Payload,
  _tenantId: number | null,
  _slug: string,
  _options: { draft: boolean; locale: TypedLocale },
): Promise<Form | null> => {
  // 1. tenantId null → null (unknown or inactive host)
  // 2. payload.find forms, frontendTenantWhere(tenantId, { slug: { equals: slug } }), locale,
  //    draft, overrideAccess: draft (as pages), depth 1 (header image, image blocks), limit 1;
  //    not previewing → the public read: published forms only (publishedOrPermission)
  // 3. none, or isActive false → null (log debug: slug, tenant, reason)
  // 4. else the form (window and members-only are shown on the page, not a 404)
  throw new Error('not implemented')
}

/**
 * Whether a form a page's block points at may render on this host: a populated form of the host's
 * tenant that is active. A page can't link another tenant's form (validateSameTenant), but an
 * old page could; the block then renders nothing instead of a form that always refuses.
 */
export const isFormForTenant = (
  _form: number | Form | null | undefined,
  _tenantId: number | null,
): _form is Form => {
  // 1. form not populated (a number) or tenantId null → false
  // 2. extractTenantId(form.tenant) !== tenantId → false
  // 3. isActive false → false; else true
  throw new Error('not implemented')
}
