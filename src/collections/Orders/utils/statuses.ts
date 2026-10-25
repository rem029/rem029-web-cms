/**
 * The values of an order's selects (rem0018). `status` is where the food is, `paymentStatus`
 * whether it's paid: they move separately (plan, "the flow"). The moves between statuses and who
 * may make them come in step 3b (`transitionGuard`).
 */
export const ORDER_STATUSES = [
  { label: 'Pending', value: 'pending' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Preparing', value: 'preparing' },
  { label: 'Prepared', value: 'prepared' },
  { label: 'Served', value: 'served' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]['value']

export const PAYMENT_STATUSES = [
  { label: 'Unpaid', value: 'unpaid' },
  { label: 'Partially paid', value: 'partially_paid' },
  { label: 'Paid', value: 'paid' },
  { label: 'Waived', value: 'waived' },
] as const

export const ORDER_SOURCES = [
  { label: 'Guest', value: 'guest' },
  { label: 'POS', value: 'pos' },
] as const

export const ORDER_TYPES = [
  { label: 'Dine in', value: 'dine_in' },
  { label: 'Takeaway', value: 'takeaway' },
] as const
