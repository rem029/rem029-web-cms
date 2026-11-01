import type { CollectionBeforeChangeHook } from 'payload'

import type { Order } from '@/payload-types'

/**
 * Completes a served order at once in flows without a cashier step (rem0018 phase 1 step 3b,
 * sdq's auto-complete): `waiter_kitchen` and `kitchen_only`. Only on a forward move into
 * `served` (from `prepared`), so moving a completed order back to `prepared` sticks
 * (adversarial review 5). Runs after `transitionGuard`, before `statusTimestamps`.
 * phase 2 step 1 (open question 1): also under `waiter_kitchen_cashier` when the order is
 * already paid (`paymentStatus` paid or waived): nothing is left for the cashier, so served
 * completes at once.
 */
export const autoComplete: CollectionBeforeChangeHook<Order> = ({
  data,
  operation,
  originalDoc,
}) => {
  const servedNow =
    operation === 'update' && originalDoc?.status === 'prepared' && data.status === 'served'
  // the incoming value first: a void sets unpaid on a paid order
  const paymentStatus = data.paymentStatus ?? originalDoc?.paymentStatus
  const isPaid = paymentStatus === 'paid' || paymentStatus === 'waived'
  if (servedNow && (originalDoc?.flow !== 'waiter_kitchen_cashier' || isPaid)) {
    data.status = 'completed'
  }
  return data
}
