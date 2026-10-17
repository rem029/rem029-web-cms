import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  Payload,
  RequestContext,
} from 'payload'
import { revalidateTag } from 'next/cache'

import { extractTenantId } from '@/common/utils/tenantCollections'

/**
 * Cached guest menu data (phase 3) is tagged per tenant: `menus_<tenantId>`. A change to a menu
 * or anything a menu shows (items, categories, allergens, tags) revalidates its tenant's tag,
 * taken from the doc. Skipped with `context.disableRevalidate` (seeds, tests, scripts outside
 * Next.js).
 */
export const menusTag = (tenantId: number): string => `menus_${tenantId}`

const revalidate = (
  payload: Payload,
  context: RequestContext,
  collection: string,
  doc: { id?: unknown; tenant?: unknown } | undefined,
  previousTenant?: unknown,
): void => {
  if (context.disableRevalidate) return
  const tenantId = extractTenantId(doc?.tenant) ?? extractTenantId(previousTenant)
  if (tenantId === null) {
    payload.logger.warn({ msg: 'revalidateMenus: no tenant, skipped', collection, docId: doc?.id })
    return
  }
  revalidateTag(menusTag(tenantId))
  payload.logger.debug({ msg: 'revalidateMenus', collection, docId: doc?.id, tenantId })
}

export const revalidateMenus: CollectionAfterChangeHook = ({
  doc,
  previousDoc,
  collection,
  req,
}) => {
  revalidate(req.payload, req.context, collection.slug, doc, previousDoc?.tenant)
  return doc
}

export const revalidateMenusDelete: CollectionAfterDeleteHook = ({ doc, collection, req }) => {
  revalidate(req.payload, req.context, collection.slug, doc)
  return doc
}
