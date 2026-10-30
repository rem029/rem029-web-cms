import type { CollectionAfterChangeHook } from 'payload'

import { afterCommit } from '@/common/utils/afterCommit'
import { publishOrderEvent } from '@/common/utils/orderEvents'
import { extractTenantId } from '@/common/utils/tenantCollections'
import type { Order } from '@/payload-types'

/**
 * Tells every open screen about a saved order (rem0018 phase 1 step 3b, plan "real time"):
 * publishes the saved doc on `orderEvents` once the save has committed (`afterCommit`), so a
 * save that rolls back later never shows. The SSE routes (phase 3 and 4) filter per tenant and
 * menu and trim per audience.
 */
export const broadcast: CollectionAfterChangeHook<Order> = async ({ doc, operation, req }) => {
  const tenantId = extractTenantId(doc.tenant)
  const menuId = extractTenantId(doc.menu)

  if (tenantId === null || menuId === null) {
    req.payload.logger.warn({ msg: 'order: event without tenant or menu', orderId: doc.id })
    return doc
  }

  await afterCommit(req, () => {
    publishOrderEvent(req.payload, {
      type: operation === 'create' ? 'created' : 'updated',
      tenantId,
      menuId,
      order: doc,
    })
  })

  return doc
}
