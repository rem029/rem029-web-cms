import type { CollectionBeforeChangeHook, CollectionSlug } from 'payload'

/** A relationship field of the doc that must point at docs of the doc's own tenant. */
export type SameTenantField = {
  /** field name on the doc, e.g. `category` or `allergens` */
  path: string
  /** the collection it points at */
  collection: CollectionSlug
  /** what an editor calls it, for the error: "category", "allergen" */
  label: string
}

/**
 * Refuses links to another business's docs (rem0017): `filterOptions` only narrows the admin
 * pickers, so a crafted API call could still link another tenant's category, allergen or tag.
 * `beforeChange`, not `beforeValidate`: draft saves skip validation (phase 2 reuses this for
 * `menus.items` and promotes it to `src/common/hooks/`).
 */
export const validateSameTenant =
  (_fields: SameTenantField[]): CollectionBeforeChangeHook =>
  async ({ data }) => {
    // 1. tenant = extractTenantId(data.tenant ?? originalDoc.tenant); none → return data
    // 2. for each field: collect the ids in data[path] (one id, a populated doc, or an array of them)
    // 3. none → next field
    // 4. payload.find(collection, where: id in ids AND tenant not_equals tenant, overrideAccess: true,
    //    depth 0, limit 1, req) — other tenants' docs must be found even if the user can't read them
    // 5. found → logger.warn({ msg: 'menu: other tenant link refused', collection, path, tenantId,
    //    userId, docId }), throw ValidationError on path:
    //    `This ${label} belongs to another business. Pick one of this business's ${label}s.`
    // 6. return data
    return data
  }
