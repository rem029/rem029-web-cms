import { APIError, NotFound, ValidationError, type Payload } from 'payload'

import { isActiveSuperUser, tenantAdminTenantIds } from '@/common/utils/access'
import { staffRolesFor } from '@/common/utils/staffRoles'
import { extractTenantId } from '@/common/utils/tenantCollections'
import type { Order, User } from '@/payload-types'

import { ORDER_MOVE_CONTEXT } from '../hooks/transitionGuard'
import { checkClose, type CloseReason, type MoveActor } from './transitions'

export type CloseOrderInput = {
  orderId: number
  // paid: its payment went through; unpaid: waived, with a reason
  outcome: 'paid' | 'unpaid'
  reason?: CloseReason
  // required with `other`
  note?: string
}

/**
 * Closes an open order (rem0018 phase 2 step 1, plan "close order"): the cashier board's
 * Close order (phase 4) calls it. Cashiers, tenant admins and super users of the order's
 * business; any open status, so a guest who skipped the app can always be finished.
 * 1. find the order as the user (`overrideAccess: false, user`, depth 0): not found / no access
 *    → 404 "Order not found" (the menu's staff list applies)
 * 2. `checkClose({ from, actor, outcome, paid, reason, note })` (actor from
 *    `staffRolesFor` + manager, as transitionGuard); refusal → APIError 403 / ValidationError
 *    on its path, `warn`
 * 3. update (overrideAccess, `context: { [ORDER_MOVE_CONTEXT]: 'close' }`):
 *    - paid: `status: completed`
 *    - unpaid: `status: completed`, `paymentStatus: waived`, `closeReason`, `closeNote` (other
 *      only, trimmed)
 *    The stamps, broadcast and audit log follow from the order's own hooks.
 * 4. log `info` with tenant id, order id, user id, outcome, reason; return the saved order
 */
export const closeOrder = async (
  payload: Payload,
  user: User,
  input: CloseOrderInput,
): Promise<Order> => {
  const order = await payload.findByID({
    collection: 'orders',
    id: input.orderId,
    overrideAccess: false,
    user,
    depth: 0,
  })

  if (!order) {
    throw new NotFound()
  }

  const tenantId = extractTenantId(order.tenant)
  const actor: MoveActor =
    tenantId === null
      ? { kind: 'staff', roles: [], isManager: isActiveSuperUser(user) }
      : {
          kind: 'staff',
          roles: staffRolesFor(user, tenantId),
          isManager: isActiveSuperUser(user) || tenantAdminTenantIds(user).includes(tenantId),
        }

  const paid = order.paymentStatus === 'paid' || order.paymentStatus === 'waived'

  const refusal = checkClose({
    from: order.status,
    actor,
    outcome: input.outcome,
    paid,
    reason: input.reason,
    note: input.note,
  })

  if (refusal) {
    payload.logger.warn({
      msg: 'order: close refused',
      orderId: order.id,
      tenantId,
      userId: user.id,
      outcome: input.outcome,
      reason: refusal.message,
    })
    if (refusal.status === 403) {
      throw new APIError(refusal.message, 403, undefined, true)
    }
    throw new ValidationError({
      collection: 'orders',
      errors: [{ path: refusal.path, message: refusal.message }],
    })
  }

  const data: Partial<Order> =
    input.outcome === 'paid'
      ? { status: 'completed' }
      : {
          status: 'completed',
          paymentStatus: 'waived',
          closeReason: input.reason,
          closeNote: input.reason === 'other' && input.note ? input.note.trim() : null,
        }

  const updatedOrder = await payload.update({
    collection: 'orders',
    id: input.orderId,
    data,
    overrideAccess: true,
    user,
    context: {
      [ORDER_MOVE_CONTEXT]: 'close',
    },
  })

  payload.logger.info({
    msg: 'order: closed',
    tenantId,
    orderId: updatedOrder.id,
    userId: user.id,
    outcome: input.outcome,
    reason: input.reason,
  })

  return updatedOrder
}
