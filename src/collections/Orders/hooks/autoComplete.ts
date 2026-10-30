import type { CollectionBeforeChangeHook } from 'payload'

import type { Order } from '@/payload-types'

/**
 * Completes a served order at once in flows without a cashier step (rem0018 phase 1 step 3b,
 * sdq's auto-complete): `waiter_kitchen` and `kitchen_only`. Only on a forward move into
 * `served` (from `prepared`), so moving a completed order back to `prepared` sticks
 * (adversarial review 5). Runs after `transitionGuard`, before `statusTimestamps`.
 */
export const autoComplete: CollectionBeforeChangeHook<Order> = ({
  data,
  operation,
  originalDoc,
}) => {
  const servedNow =
    operation === 'update' && originalDoc?.status === 'prepared' && data.status === 'served'
  if (servedNow && originalDoc?.flow !== 'waiter_kitchen_cashier') {
    data.status = 'completed'
  }
  return data
}
