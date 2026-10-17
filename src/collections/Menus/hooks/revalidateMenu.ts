import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

/**
 * Cached guest menu data (phase 3) is tagged per tenant: `menus_<tenantId>`. A change to a menu
 * or anything a menu shows (items, categories, allergens, tags) revalidates its tenant's tag,
 * taken from the doc. Skipped with `context.disableRevalidate` (seeds, tests, scripts outside
 * Next.js).
 */
export const menusTag = (tenantId: number): string => `menus_${tenantId}`

export const revalidateMenus: CollectionAfterChangeHook = ({ doc }) => {
  // 1. context.disableRevalidate → return doc
  // 2. tenantId = extractTenantId(doc.tenant) ?? extractTenantId(previousDoc?.tenant)
  // 3. none → logger.warn({ msg: 'revalidateMenus: no tenant', collection, docId }), return doc
  // 4. revalidateTag(menusTag(tenantId)); logger.debug with collection, docId, tenantId
  return doc
}

export const revalidateMenusDelete: CollectionAfterDeleteHook = ({ doc }) => {
  // same as above with doc only
  return doc
}
