import type { Payload } from 'payload'

/**
 * A tenant's currency (Settings → Currency), `DEFAULT_CURRENCY` without settings. Read without
 * access: the currency is no secret. Used by the items list price cell, the menu builder and the
 * guest menu pages (promoted from the first two in rem0017 phase 3).
 */
export const tenantCurrency = async (payload: Payload, tenantId: number): Promise<string> => {
  // 1. payload.find settings where tenant equals tenantId, limit 1, depth 0
  // 2. docs[0]?.currency ?? DEFAULT_CURRENCY
  // (then PriceCell wraps it in react cache, builder.ts imports it, both local copies removed)
  void payload
  void tenantId
  throw new Error('not implemented')
}
