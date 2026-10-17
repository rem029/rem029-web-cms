import type { Payload } from 'payload'

import { DEFAULT_CURRENCY } from '@/collections/Settings/fields/currency'

/**
 * A tenant's currency (Settings → Currency), `DEFAULT_CURRENCY` without settings. Read without
 * access: the currency is no secret. Used by the items list price cell, the menu builder and the
 * guest menu pages.
 */
export const tenantCurrency = async (payload: Payload, tenantId: number): Promise<string> => {
  const { docs } = await payload.find({
    collection: 'settings',
    where: { tenant: { equals: tenantId } },
    limit: 1,
    depth: 0,
  })
  return docs[0]?.currency ?? DEFAULT_CURRENCY
}
