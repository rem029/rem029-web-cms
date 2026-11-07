/**
 * Who handles a menu's orders (rem0018, sdq's "order handling"). Snapshotted on each order, so
 * changing it never breaks orders already open. A plain module (no `payload` import): the staff
 * boards' client code reads it too (rem0018 phase 4).
 */
export const ORDER_FLOWS = [
  { label: 'Waiter, kitchen and cashier', value: 'waiter_kitchen_cashier' },
  { label: 'Waiter and kitchen', value: 'waiter_kitchen' },
  { label: 'Kitchen only', value: 'kitchen_only' },
] as const

export type OrderFlow = (typeof ORDER_FLOWS)[number]['value']

export const DEFAULT_ORDER_FLOW: OrderFlow = 'waiter_kitchen_cashier'
