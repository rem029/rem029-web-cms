import { sql } from '@payloadcms/db-postgres'
import {
  APIError,
  ValidationError,
  type CollectionBeforeValidateHook,
  type PayloadRequest,
} from 'payload'

import { isActiveSuperUser, tenantAdminTenantIds } from '@/common/utils/access'
import { staffRolesFor } from '@/common/utils/staffRoles'
import { extractTenantId } from '@/common/utils/tenantCollections'
import type { Payment } from '@/payload-types'

type Query = ReturnType<typeof sql>

const isExecutor = (val: unknown): val is { execute: (query: Query) => Promise<unknown> } =>
  typeof val === 'object' && val !== null && 'execute' in val && typeof val.execute === 'function'

type LogContext = { tenantId?: number | null; orderId?: number | null; paymentId?: number }

const NOT_CASHIER = 'Only a cashier or a manager can take payments.'
const TAKEN = "A taken payment can't be changed. Void it and record a new one."

// a refusal: `warn` with the context, then a ValidationError on the field
const refuse = (req: PayloadRequest, ctx: LogContext, path: string, message: string): never => {
  req.payload.logger.warn({
    msg: `payment refused: ${message}`,
    path,
    userId: req.user?.id,
    ...ctx,
  })
  throw new ValidationError({ collection: 'payments', errors: [{ path, message }], req })
}

const forbid = (req: PayloadRequest, ctx: LogContext): never => {
  req.payload.logger.warn({ msg: `payment refused: ${NOT_CASHIER}`, userId: req.user?.id, ...ctx })
  throw new APIError(NOT_CASHIER, 403, undefined, true)
}

// locks the order row in the request's transaction, so two payments at once can't both pay it
const lockOrder = async (req: PayloadRequest, orderId: number): Promise<void> => {
  const transactionID = req.transactionID ? await req.transactionID : undefined
  const session =
    transactionID !== undefined ? req.payload.db.sessions?.[transactionID]?.db : undefined
  if (!isExecutor(session)) {
    req.payload.logger.warn({ msg: 'payment: no transaction, order not locked', orderId })
    return
  }
  await session.execute(sql`SELECT id FROM orders WHERE id = ${orderId} FOR UPDATE`)
}

/**
 * The rules of a payment save (rem0018 phase 2 step 1), on every create and update, drafts
 * included. Runs after `validateSameTenant` (same tenant as the order). One payment pays an
 * order, for its full total (no split or part payments, user 2026-11-01). Refusals are
 * `ValidationError`s on the field, in plain words, except the role check (403).
 *
 * create:
 * 1. lock the order row first (adversarial review 1), then read it
 * 2. a user (none = server code, step 2's online payments) must read the order (the menu's
 *    staff list) and be a cashier, a tenant admin or a super user (403); online payments come
 *    only from server code
 * 3. the order is not cancelled, paid or closed without payment
 * 4. `amount` = the order's total; a cash or card payment is `succeeded` (taken on the spot)
 * 5. card: receipt number required; cash: received ≥ amount (empty = exact), change computed
 * 6. copies from the order: `orderNumber`, `menu`, `currency`; `takenBy` = the user
 *
 * update:
 * 7. voided / failed / cancelled are final; a pending payment (online) changes only from server
 *    code
 * 8. a succeeded payment only becomes `voided`, with a reason; its method, received, reference
 *    and order never change (remarks may)
 */
export const validatePayment: CollectionBeforeValidateHook<Payment> = async ({
  data,
  req,
  operation,
  originalDoc,
}) => {
  if (!data) return data

  if (operation === 'update') {
    const ctx: LogContext = {
      tenantId: extractTenantId(originalDoc?.tenant),
      orderId: extractTenantId(originalDoc?.order),
      paymentId: originalDoc?.id,
    }
    const before = originalDoc?.status

    // 7. closed payments are final; pending (online) ones belong to the provider
    if (before === 'voided' || before === 'failed' || before === 'cancelled') {
      refuse(req, ctx, 'status', 'This payment is closed.')
    }
    if (before === 'pending' && req.user) {
      refuse(req, ctx, 'status', 'Online payments come from the payment provider.')
    }

    // 8. a succeeded payment: only voided, with a reason
    if (before === 'succeeded') {
      const changed = (key: 'method' | 'received' | 'reference') =>
        data[key] !== undefined && (data[key] ?? null) !== (originalDoc?.[key] ?? null)
      const orderChanged = data.order !== undefined && extractTenantId(data.order) !== ctx.orderId
      const statusChanged =
        data.status !== undefined && data.status !== 'succeeded' && data.status !== 'voided'
      if (
        orderChanged ||
        statusChanged ||
        changed('method') ||
        changed('received') ||
        changed('reference')
      ) {
        refuse(req, ctx, 'status', TAKEN)
      }

      if (data.status === 'voided') {
        const voidReason = data.voidReason?.trim()
        if (!voidReason) refuse(req, ctx, 'voidReason', 'Give a reason to void the payment.')
        data.voidReason = voidReason
      }
    }

    req.payload.logger.debug({ msg: 'payment: update checked', ...ctx })
    return data
  }

  // 1. lock, then read the order
  const orderId = extractTenantId(data.order)
  if (orderId === null) return refuse(req, {}, 'order', 'Pick an order.')
  await lockOrder(req, orderId)
  const order = await req.payload.findByID({
    collection: 'orders',
    id: orderId,
    overrideAccess: true,
    req,
    depth: 0,
    disableErrors: true,
  })
  if (!order) return refuse(req, { orderId }, 'order', 'Pick an order.')
  const tenantId = extractTenantId(order.tenant)
  const ctx: LogContext = { tenantId, orderId }

  // 2. who takes it
  if (req.user) {
    const readable = await req.payload.findByID({
      collection: 'orders',
      id: orderId,
      overrideAccess: false,
      user: req.user,
      req,
      depth: 0,
      disableErrors: true,
    })
    const isManager =
      isActiveSuperUser(req.user) ||
      (tenantId !== null && tenantAdminTenantIds(req.user).includes(tenantId))
    const isCashier = tenantId !== null && staffRolesFor(req.user, tenantId).includes('cashier')
    if (!readable || (!isManager && !isCashier)) forbid(req, ctx)
    if (data.method === 'online') {
      refuse(req, ctx, 'method', 'Online payments come from the payment provider.')
    }
  }

  // 3. the order takes a payment
  if (order.status === 'cancelled') refuse(req, ctx, 'order', 'This order was cancelled.')
  if (order.paymentStatus === 'paid') refuse(req, ctx, 'order', 'This order is already paid.')
  if (order.paymentStatus === 'waived') {
    refuse(req, ctx, 'order', 'This order was closed without payment.')
  }

  // 4. the amount is the order's total; cash and card are taken on the spot (super users may pick
  //    another status, e.g. to record a failed card attempt)
  const amount = order.total ?? 0
  data.amount = amount
  if (data.method !== 'online' && !isActiveSuperUser(req.user)) data.status = 'succeeded'

  // 5. method rules
  if (data.method === 'card') {
    const reference = data.reference?.trim()
    if (!reference) {
      refuse(req, ctx, 'reference', 'Enter the receipt number from the card machine.')
    }
    data.reference = reference
  }
  if (data.method === 'cash') {
    const received = data.received ?? amount
    if (received < amount) {
      refuse(req, ctx, 'received', 'The guest handed over less than the total.')
    }
    data.received = received
    data.change = received - amount
  } else {
    data.received = null
    data.change = null
  }

  // 6. copies from the order
  data.tenant = tenantId
  data.orderNumber = order.orderNumber
  data.menu = extractTenantId(order.menu)
  data.currency = order.currency
  if (req.user) data.takenBy = req.user.id

  req.payload.logger.debug({ msg: 'payment: create checked', ...ctx })
  return data
}
