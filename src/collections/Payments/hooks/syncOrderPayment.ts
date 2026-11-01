import type { CollectionAfterChangeHook } from 'payload'

import { DEFAULT_ORDER_FLOW } from '@/collections/Menus/fields/ordering'
import { ORDER_MOVE_CONTEXT } from '@/collections/Orders/hooks/transitionGuard'
import { extractTenantId } from '@/common/utils/tenantCollections'
import type { Order, Payment } from '@/payload-types'

/**
 * Keeps the order's payment status in step with its payment (rem0018 phase 2 step 1), after
 * every save, in the request's transaction (a failure rolls the payment back too):
 * 1. skip unless the payment is new or its status changed (remarks only: nothing to do)
 * 2. `paymentStatus`: a new succeeded payment → paid; voided → unpaid (waived orders are never
 *    touched: closed without payment)
 * 3. update the order (overrideAccess, req, `context: { orderMove: 'payment' }`); when it is
 *    `served` under `waiter_kitchen_cashier` and now paid, also `status: completed`
 *    (transitionGuard lets the payment's move through: `ORDER_MOVE_CONTEXT`). A void never moves
 *    the status back: a completed order with a voided payment stays completed and unpaid
 *    (adversarial review 9). The order's own `broadcast` tells open screens (after commit).
 * 4. log `info` with tenant id, order id, payment id, paymentStatus
 */
export const syncOrderPayment: CollectionAfterChangeHook<Payment> = async ({
  doc,
  previousDoc,
  operation,
  req,
}) => {
  // 1. skip unless the payment is new or its status changed (remarks only: nothing to do)
  const isNew = operation === 'create'
  const statusChanged = doc.status !== previousDoc?.status

  if (!isNew && !statusChanged) {
    return doc
  }

  // 2. `paymentStatus`: a new succeeded payment → paid; voided → unpaid (waived orders are never
  //    touched: closed without payment)
  let targetPaymentStatus: 'paid' | 'unpaid' | null = null
  if (isNew && doc.status === 'succeeded') {
    targetPaymentStatus = 'paid'
  } else if (doc.status === 'voided' && previousDoc?.status !== 'voided') {
    targetPaymentStatus = 'unpaid'
  }

  if (targetPaymentStatus === null) {
    return doc
  }

  const orderId = extractTenantId(doc.order)
  if (orderId === null) {
    return doc
  }

  const order = await req.payload.findByID({
    collection: 'orders',
    id: orderId,
    depth: 0,
    overrideAccess: true,
    req,
  })

  if (!order) {
    return doc
  }

  // waived orders are never touched: closed without payment
  if (targetPaymentStatus === 'unpaid' && order.paymentStatus === 'waived') {
    return doc
  }

  // 3. update the order (overrideAccess, req, `context: { orderMove: 'payment' }`); when it is
  //    `served` under `waiter_kitchen_cashier` and now paid, also `status: completed`
  const orderData: Partial<Order> = {
    paymentStatus: targetPaymentStatus,
  }

  const flow = order.flow ?? DEFAULT_ORDER_FLOW
  if (
    targetPaymentStatus === 'paid' &&
    order.status === 'served' &&
    flow === 'waiter_kitchen_cashier'
  ) {
    orderData.status = 'completed'
  }

  await req.payload.update({
    collection: 'orders',
    id: orderId,
    data: orderData,
    req,
    overrideAccess: true,
    context: {
      [ORDER_MOVE_CONTEXT]: 'payment',
    },
  })

  // 4. log `info` with tenant id, order id, payment id, paymentStatus
  const tenantId = extractTenantId(doc.tenant ?? order.tenant)
  req.payload.logger.info({
    msg: 'payment: order payment synced',
    tenantId,
    orderId,
    paymentId: doc.id,
    paymentStatus: targetPaymentStatus,
  })

  return doc
}
