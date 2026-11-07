import { DEFAULT_ORDER_FLOW } from '@/collections/Menus/fields/orderFlows'
import type { BoardContext } from '@/collections/Orders/utils/board'
import type { OrderStatus } from '@/collections/Orders/utils/statuses'
import {
  checkMove,
  moveOwner,
  NEXT_STATUS,
  previousStatus,
  type MoveActor,
} from '@/collections/Orders/utils/transitions'
import type { StaffRole } from '@/common/utils/staffRoles'
import type { Order } from '@/payload-types'

/**
 * The buttons a board shows on one order (rem0018 phase 4 step 2a): pure, no `payload` import, so
 * the board shows only what the server will allow. The rules come from `checkMove` /
 * `previousStatus` / `moveOwner` / `NEXT_STATUS` (`src/collections/Orders/utils/transitions.ts`,
 * pure too); nothing is decided twice.
 */
export type OrderButton =
  // the next status (Confirm, Start preparing, Mark prepared, Serve, Complete)
  | { kind: 'forward'; to: OrderStatus; label: string }
  // one step back (`previousStatus`)
  | { kind: 'back'; to: OrderStatus; label: string }
  // always behind ConfirmDialog
  | { kind: 'cancel'; label: string }
  // cashier only (step 2b dialogs)
  | { kind: 'pay'; label: string }
  | { kind: 'close'; label: string }
  // a guest request is waiting (AssistanceBadge's "Done")
  | { kind: 'clearStaff'; label: string }
  | { kind: 'clearBill'; label: string }

export type OrderButtonsArgs = {
  order: Order
  // the board the order is shown on: only that role's moves get a button (a tenant admin on the
  // kitchen board sees the kitchen's buttons, not the waiter's)
  role: StaffRole
  context: Pick<BoardContext, 'isManager' | 'today'>
}

/**
 * 1. actor = `{ kind: 'staff', roles: [role], isManager }`; flow = `order.flow`; paid =
 *    paymentStatus paid / waived; sameBusinessDay = `order.orderDate === today`
 * 2. forward: `to = NEXT_STATUS[status]`; shown when `moveOwner(flow, to) === role` and
 *    `checkMove` allows it. Label from FORWARD_LABELS[to]
 * 3. back: `to = previousStatus(flow, status)`; shown when `checkMove` allows it ("Move back")
 * 4. cancel: shown when `checkMove({ to: 'cancelled', cancelReason: 'x' })` allows it (so after
 *    preparing only the kitchen board and managers)
 * 5. cashier board: `pay` when open or completed and `paymentStatus` unpaid; `close` when open
 *    (not completed / cancelled)
 * 6. `clearStaff` / `clearBill` when `assistanceRequestedAt` / `billRequestedAt` is set
 * Order: forward, pay, close, clearStaff, clearBill, back, cancel (the main action first).
 */
export const orderButtons = (args: OrderButtonsArgs): OrderButton[] => {
  const { order, role, context } = args
  const flow = order.flow ?? DEFAULT_ORDER_FLOW
  const paid = order.paymentStatus === 'paid' || order.paymentStatus === 'waived'
  const sameBusinessDay = order.orderDate === context.today
  const actor: MoveActor = { kind: 'staff', roles: [role], isManager: context.isManager }

  const buttons: OrderButton[] = []

  // 1. forward
  const nextTo = NEXT_STATUS[order.status]
  if (nextTo && moveOwner(flow, nextTo) === role) {
    const refusal = checkMove({
      from: order.status,
      to: nextTo,
      flow,
      actor,
      sameBusinessDay,
      paid,
    })
    if (!refusal) {
      buttons.push({
        kind: 'forward',
        to: nextTo,
        label: FORWARD_LABELS[nextTo] ?? '',
      })
    }
  }

  // 2. pay (cashier only)
  if (role === 'cashier' && order.status !== 'cancelled' && order.paymentStatus === 'unpaid') {
    buttons.push({ kind: 'pay', label: 'Take payment' })
  }

  // 3. close (cashier only)
  if (role === 'cashier' && order.status !== 'completed' && order.status !== 'cancelled') {
    buttons.push({ kind: 'close', label: 'Close order' })
  }

  // 4. clearStaff
  if (order.assistanceRequestedAt) {
    buttons.push({ kind: 'clearStaff', label: 'Done' })
  }

  // 5. clearBill
  if (order.billRequestedAt) {
    buttons.push({ kind: 'clearBill', label: 'Done' })
  }

  // 6. back
  const prevTo = previousStatus(flow, order.status)
  if (prevTo !== null) {
    const refusal = checkMove({
      from: order.status,
      to: prevTo,
      flow,
      actor,
      sameBusinessDay,
      paid,
    })
    if (!refusal) {
      buttons.push({ kind: 'back', to: prevTo, label: 'Move back' })
    }
  }

  // 7. cancel
  const cancelRefusal = checkMove({
    from: order.status,
    to: 'cancelled',
    flow,
    actor,
    sameBusinessDay,
    paid,
    cancelReason: 'x',
  })
  if (!cancelRefusal) {
    buttons.push({ kind: 'cancel', label: 'Cancel' })
  }

  return buttons
}

/** The forward button labels, by target status. */
export const FORWARD_LABELS: Partial<Record<OrderStatus, string>> = {
  confirmed: 'Confirm',
  preparing: 'Start preparing',
  prepared: 'Mark prepared',
  served: 'Serve',
  completed: 'Complete',
}
