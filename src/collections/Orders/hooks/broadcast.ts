import type { CollectionAfterChangeHook, PayloadRequest } from 'payload'

import { afterCommit } from '@/common/utils/afterCommit'
import { publishOrderEvent } from '@/common/utils/orderEvents'
import { extractTenantId } from '@/common/utils/tenantCollections'
import type { Order } from '@/payload-types'

const withTable = async (doc: Order, req: PayloadRequest): Promise<Order> => {
  if (typeof doc.table !== 'number') return doc
  try {
    const table = await req.payload.findByID({
      collection: 'tables',
      id: doc.table,
      depth: 0,
      overrideAccess: true,
      req,
    })
    return { ...doc, table }
  } catch (err) {
    req.payload.logger.warn({ msg: 'order: event table lookup failed', orderId: doc.id, err })
    return doc
  }
}

/**
 * Tells every open screen about a saved order (rem0018 phase 1 step 3b, plan "real time"):
 * publishes the saved doc on `orderEvents` once the save has committed (`afterCommit`), so a
 * save that rolls back later never shows. The SSE routes (phase 3 and 4) filter per tenant and
 * menu and trim per audience. The table goes out as its doc (label included) even when the save
 * held only its id (a depth-0 save, e.g. a REST call), so every board can show "Table 2", never
 * the id: one lookup in the save's transaction.
 */
export const broadcast: CollectionAfterChangeHook<Order> = async ({ doc, operation, req }) => {
  const tenantId = extractTenantId(doc.tenant)
  const menuId = extractTenantId(doc.menu)

  if (tenantId === null || menuId === null) {
    req.payload.logger.warn({ msg: 'order: event without tenant or menu', orderId: doc.id })
    return doc
  }

  const order = await withTable(doc, req)

  await afterCommit(req, () => {
    publishOrderEvent(req.payload, {
      type: operation === 'create' ? 'created' : 'updated',
      tenantId,
      menuId,
      order,
    })
  })

  return doc
}
