import type { OrderFlow } from '@/collections/Menus/fields/ordering'
import type { StaffRole } from '@/common/utils/staffRoles'
import type { Order } from '@/payload-types'

import { ORDER_STATUSES, type OrderStatus } from './statuses'

/**
 * The moves between statuses and who may make them (rem0018 phase 1 step 3b, plan "the flow").
 * Pure, no payload import: `transitionGuard` asks it on every status change, the boards (phase 4)
 * use it to show only the buttons a user can press.
 */

/** The next status forward; `null` = no forward move (completed, cancelled). */
export const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
  pending: 'confirmed',
  confirmed: 'preparing',
  preparing: 'prepared',
  prepared: 'served',
  served: 'completed',
  completed: null,
  cancelled: null,
}

/** The forward order of statuses (cancelled is off the line). */
export const FORWARD_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'prepared',
  'served',
  'completed',
]

/** The date field each status stamps when an order reaches it (`statusTimestamps`). */
export const STATUS_TIMESTAMP_FIELDS: Record<
  Exclude<OrderStatus, 'pending'>,
  keyof Pick<
    Order,
    'confirmedAt' | 'preparingAt' | 'preparedAt' | 'servedAt' | 'completedAt' | 'cancelledAt'
  >
> = {
  confirmed: 'confirmedAt',
  preparing: 'preparingAt',
  prepared: 'preparedAt',
  served: 'servedAt',
  completed: 'completedAt',
  cancelled: 'cancelledAt',
}

/** Who makes a move: a guest (no user), or a user with their roles in the order's business. */
export type MoveActor =
  | { kind: 'guest' }
  // manager = tenant admin of the order's business, or a super user: every move
  | { kind: 'staff'; roles: StaffRole[]; isManager: boolean }

export type MoveCheck = {
  from: OrderStatus
  to: OrderStatus
  flow: OrderFlow
  actor: MoveActor
  cancelReason?: string | null
  // the order's business day is today's (moving a completed order back is same-day only)
  sameBusinessDay: boolean
}

/** Why a move is refused: 400 for a move that doesn't exist, 403 for the wrong person. */
export type MoveRefusal = {
  status: 400 | 403
  path: 'status' | 'cancelReason'
  message: string
}

const statusLabel = (status: OrderStatus): string => {
  const found = ORDER_STATUSES.find((s) => s.value === status)
  return found?.label ?? status
}

/**
 * The role that owns the forward move into `to` under `flow`: waiter confirms and serves, kitchen
 * prepares and marks prepared, cashier completes. `kitchen_only` gives the waiter's moves to the
 * kitchen. `null` for `pending` / `cancelled` (nobody moves forward into them).
 */
export const moveOwner = (flow: OrderFlow, to: OrderStatus): StaffRole | null => {
  if (to === 'confirmed' || to === 'served') {
    return flow === 'kitchen_only' ? 'kitchen' : 'waiter'
  }
  if (to === 'preparing' || to === 'prepared') {
    return 'kitchen'
  }
  if (to === 'completed') {
    if (flow === 'waiter_kitchen_cashier') {
      return 'cashier'
    }
    return flow === 'kitchen_only' ? 'kitchen' : 'waiter'
  }
  return null
}

/**
 * The previous status of a move back, or `null` when `from` can't move back: one step back on
 * any open order; `completed` moves back (to `prepared`, skipping `served`) only in flows
 * without a cashier, because there `served` completes at once (adversarial review 5).
 */
export const previousStatus = (flow: OrderFlow, from: OrderStatus): OrderStatus | null => {
  if (from === 'pending' || from === 'cancelled') {
    return null
  }
  if (from === 'completed') {
    return flow === 'waiter_kitchen_cashier' ? null : 'prepared'
  }
  return FORWARD_STATUSES[FORWARD_STATUSES.indexOf(from) - 1] ?? null
}

/**
 * Whether `actor` may move an order from `from` to `to`; `null` = allowed. Messages are plain
 * words for the board and the admin ("Only the kitchen can …").
 */
export const checkMove = (check: MoveCheck): MoveRefusal | null => {
  const { from, to, flow, actor, cancelReason, sameBusinessDay } = check

  // 1. to === 'cancelled':
  if (to === 'cancelled') {
    // from completed / cancelled → 400 "This order is already closed."
    if (from === 'completed' || from === 'cancelled') {
      return {
        status: 400,
        path: 'status',
        message: 'This order is already closed.',
      }
    }

    // guest: only from pending, else 403 "This order can no longer be cancelled. Ask a member of staff."; no reason needed
    if (actor.kind === 'guest') {
      if (from !== 'pending') {
        return {
          status: 403,
          path: 'status',
          message: 'This order can no longer be cancelled. Ask a member of staff.',
        }
      }
      return null
    }

    // staff: before preparing (pending, confirmed): waiter, kitchen, cashier or manager;
    // from preparing on: kitchen or manager, else 403 "Only the kitchen or a manager can cancel once the kitchen has started."
    if (from === 'preparing' || from === 'prepared' || from === 'served') {
      if (!actor.isManager && !actor.roles.includes('kitchen')) {
        return {
          status: 403,
          path: 'status',
          message: 'Only the kitchen or a manager can cancel once the kitchen has started.',
        }
      }
    } else if (!actor.isManager && actor.roles.length === 0) {
      return {
        status: 403,
        path: 'status',
        message: 'Only staff can cancel this order.',
      }
    }

    // staff: no cancelReason (trimmed) → 400 on cancelReason "Give a reason to cancel."
    if (!cancelReason || !cancelReason.trim()) {
      return {
        status: 400,
        path: 'cancelReason',
        message: 'Give a reason to cancel.',
      }
    }

    return null
  }

  // 2. guest, any other move → 403 "Only staff can move this order."
  if (actor.kind === 'guest') {
    return {
      status: 403,
      path: 'status',
      message: 'Only staff can move this order.',
    }
  }

  // 3. to === NEXT_STATUS[from] (forward):
  if (to === NEXT_STATUS[from]) {
    // served → completed in flows without a cashier: autoComplete's move, 400 (never asked)
    if (from === 'served' && flow !== 'waiter_kitchen_cashier') {
      return {
        status: 400,
        path: 'status',
        message: `An order can't go from ${statusLabel(from)} to ${statusLabel(to)}.`,
      }
    }

    const owner = moveOwner(flow, to)
    if (actor.isManager || (owner && actor.roles.includes(owner))) {
      return null
    }

    return {
      status: 403,
      path: 'status',
      message: `Only the ${owner} can move this order to ${statusLabel(to)}.`,
    }
  }

  // 4. to === previousStatus(flow, from) (move back):
  const prev = previousStatus(flow, from)
  if (prev !== null && to === prev) {
    if (from === 'completed' && !sameBusinessDay) {
      return {
        status: 400,
        path: 'status',
        message: "Orders from an earlier day can't be moved back.",
      }
    }

    const owner =
      from === 'completed' && flow !== 'waiter_kitchen_cashier'
        ? moveOwner(flow, 'served')
        : moveOwner(flow, from)

    if (actor.isManager || (owner && actor.roles.includes(owner))) {
      return null
    }

    return {
      status: 403,
      path: 'status',
      message: `Only the ${owner} can move this order back.`,
    }
  }

  // 5. anything else → 400 "An order can't go from <From> to <To>. Move it one step at a time."
  return {
    status: 400,
    path: 'status',
    message: `An order can't go from ${statusLabel(from)} to ${statusLabel(to)}. Move it one step at a time.`,
  }
}
