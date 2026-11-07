import { APIError, NotFound, ValidationError, type Payload, type Where } from 'payload'

import { DEFAULT_ORDER_FLOW, type OrderFlow } from '@/collections/Menus/fields/orderFlows'
import { isActiveSuperUser, tenantAdminTenantIds } from '@/common/utils/access'
import { businessDate } from '@/common/utils/restaurantHours'
import { staffMenuIds, staffReqFor, staffRolesFor, type StaffRole } from '@/common/utils/staffRoles'
import { extractTenantId } from '@/common/utils/tenantCollections'
import type { Order, Payment, User } from '@/payload-types'

import type { OrderStatus } from './statuses'

/**
 * The staff boards' server side (rem0018 phase 4 step 1, phase file "step 1"): the board actions
 * (`src/common/components/OrderBoard/actions.ts`) are thin wrappers over these. Every read and
 * write is a Local API call as the user (`overrideAccess: false, user`), so the orders' own hooks
 * and tenant access decide (`transitionGuard`, `validatePayment`, the menu's staff list); nothing
 * here re-implements a check, except where a field is `serverOnly` (the guest request stamps).
 */

/** A menu a board can filter on: published, ordering on, one the user works. */
export type BoardMenu = {
  id: number
  title: string
  flow: OrderFlow
  showPrices: boolean
}

export type BoardContext = {
  tenantId: number
  // the board's user: the browser storage keys (step 2a)
  userId: number
  // tenant admin of this tenant or super user: every move, cancel after preparing (step 2a)
  isManager: boolean
  // the user's roles in that tenant (`staffRolesFor`); empty → the board refuses
  roles: StaffRole[]
  menus: BoardMenu[]
  // the business day "today" in the restaurant's timezone (`businessDate`), for history paging
  today: string
}

/**
 * The lists a board shows:
 * - `active`: open orders the role acts on (waiter: pending → served; kitchen: confirmed →
 *   prepared; cashier: "Waiting for payment" = served under the cashier flow, plus any open order
 *   with a bill request)
 * - `history`: completed and cancelled orders of one business day (`date`, default today)
 * - `unpaid` (cashier): open or completed orders whose `paymentStatus` is `unpaid`
 * - `earlier` (cashier): open orders from before today's business day
 */
export type BoardList = 'active' | 'history' | 'unpaid' | 'earlier'

export type ListBoardOrdersInput = {
  tenantId: number
  role: StaffRole
  list: BoardList
  // only this menu (the board's menu filter); else every menu of the user
  menuId?: number
  // `history` only: the business day, `YYYY-MM-DD`
  date?: string
  // `history` only: the page, from 1 (`HISTORY_PAGE_SIZE` orders a page)
  page?: number
}

/** History orders per page (user 2026-11-05: page it, a busy day has many orders). */
export const HISTORY_PAGE_SIZE = 50

/** A board list: every order for the open lists, one page for `history`. */
export type BoardOrders = {
  orders: Order[]
  page: number
  totalPages: number
}

export type MoveOrderInput = {
  orderId: number
  status: OrderStatus
  // required for `cancelled` (transitionGuard)
  cancelReason?: string
}

export type RecordPaymentInput = {
  orderId: number
  method: 'cash' | 'card'
  // cash: what the guest handed over (minor units); the change follows from the payment's hooks
  received?: number
  // card: the terminal's receipt number (required for card by validatePayment)
  reference?: string
  remarks?: string
}

export type VoidPaymentInput = {
  paymentId: number
  reason: string
}

export type ClearAssistanceInput = {
  orderId: number
  // `staff`: Call staff (`assistanceRequestedAt`); `bill`: Ask for the bill (`billRequestedAt`)
  kind: 'staff' | 'bill'
}

// every status before completed / cancelled
const OPEN_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'prepared', 'served']

const getTenantRestaurantSettings = async (
  payload: Payload,
  tenantId: number,
): Promise<{ timezone: string; dayStartsAt: string; today: string }> => {
  const { docs: settings } = await payload.find({
    collection: 'settings',
    where: { tenant: { equals: tenantId } },
    overrideAccess: true,
    depth: 0,
    limit: 1,
  })

  const setting = settings[0]
  const timezone = setting?.restaurant?.timezone || 'UTC'
  const dayStartsAt = setting?.restaurant?.dayStartsAt || '00:00'
  const today = businessDate(new Date(), timezone, dayStartsAt)

  return { timezone, dayStartsAt, today }
}

/**
 * What the board needs to open for the selected tenant.
 * 1. roles = `staffRolesFor(user, tenantId)`; none → APIError 403 "You don't work on any board
 *    of this business", `warn` with user id and tenant id
 * 2. menus: `payload.find` menus as the user (`overrideAccess: false`, published, tenant,
 *    `ordering.enabled`), narrowed to `staffMenuIds` (null = all); select id, title, ordering
 * 3. today = `businessDate(now, settings timezone, dayStartsAt)` from the tenant's Settings
 *    Restaurant tab (as `assignOrderNumber` reads it)
 * 4. `debug` log with user id, tenant id, roles, menu count
 */
export const getBoardContext = async (
  payload: Payload,
  user: User,
  tenantId: number,
): Promise<BoardContext> => {
  const roles = staffRolesFor(user, tenantId)
  if (roles.length === 0) {
    payload.logger.warn({
      msg: 'board: context refused, no staff roles',
      userId: user.id,
      tenantId,
    })
    throw new APIError("You don't work on any board of this business", 403, undefined, true)
  }

  const req = await staffReqFor(payload, user)
  const allowedMenuIds = await staffMenuIds(req, tenantId)

  let menus: BoardMenu[] = []
  if (allowedMenuIds === null || allowedMenuIds.length > 0) {
    const whereConditions: Where[] = [
      { tenant: { equals: tenantId } },
      { _status: { equals: 'published' } },
      { 'ordering.enabled': { equals: true } },
    ]
    if (allowedMenuIds !== null) {
      whereConditions.push({ id: { in: allowedMenuIds } })
    }

    const { docs } = await payload.find({
      collection: 'menus',
      where: { and: whereConditions },
      select: {
        id: true,
        title: true,
        ordering: true,
      },
      depth: 0,
      pagination: false,
      user,
      overrideAccess: false,
    })

    menus = docs.map((doc) => ({
      id: doc.id,
      title: doc.title,
      flow: doc.ordering?.flow ?? DEFAULT_ORDER_FLOW,
      showPrices: doc.ordering?.showPrices ?? true,
    }))
  }

  const { today } = await getTenantRestaurantSettings(payload, tenantId)

  payload.logger.debug({
    msg: 'board: context loaded',
    userId: user.id,
    tenantId,
    roles,
    menuCount: menus.length,
  })

  return {
    tenantId,
    userId: user.id,
    isManager: isActiveSuperUser(user) || tenantAdminTenantIds(user).includes(tenantId),
    roles,
    menus,
    today,
  }
}

/**
 * One board list, newest first (history), oldest first (active, so the longest wait is on top).
 * 1. the role must be one of `staffRolesFor(user, tenantId)` (403 otherwise; `unpaid` and
 *    `earlier` only for `cashier`)
 * 2. where: tenant, `menuId` if given, plus the list's statuses / paymentStatus / orderDate
 *    (see `BoardList`); `earlier` = open statuses and `orderDate` before today
 * 3. `payload.find` orders as the user (`overrideAccess: false`, depth 1 for table and payments,
 *    `pagination: false` for the open lists; history `limit: HISTORY_PAGE_SIZE`, `page`), so the
 *    menu's staff list applies; open lists return page 1 of 1
 */
export const listBoardOrders = async (
  payload: Payload,
  user: User,
  input: ListBoardOrdersInput,
): Promise<BoardOrders> => {
  const userRoles = staffRolesFor(user, input.tenantId)
  if (!userRoles.includes(input.role)) {
    payload.logger.warn({
      msg: 'board: list orders refused, user does not have role',
      userId: user.id,
      tenantId: input.tenantId,
      role: input.role,
    })
    throw new APIError('You do not have this role for this business', 403, undefined, true)
  }

  if ((input.list === 'unpaid' || input.list === 'earlier') && input.role !== 'cashier') {
    payload.logger.warn({
      msg: 'board: list orders refused, role not cashier for cashier list',
      userId: user.id,
      tenantId: input.tenantId,
      role: input.role,
      list: input.list,
    })
    throw new APIError('Only cashiers may view this list', 403, undefined, true)
  }

  let listWhere: Where
  if (input.list === 'active') {
    if (input.role === 'waiter') {
      listWhere = {
        status: { in: OPEN_STATUSES },
      }
    } else if (input.role === 'kitchen') {
      listWhere = {
        status: { in: ['confirmed', 'preparing', 'prepared'] },
      }
    } else {
      listWhere = {
        or: [
          {
            and: [
              { status: { equals: 'served' } },
              { paymentStatus: { equals: 'unpaid' } },
              { flow: { equals: 'waiter_kitchen_cashier' } },
            ],
          },
          {
            and: [{ status: { in: OPEN_STATUSES } }, { billRequestedAt: { exists: true } }],
          },
        ],
      }
    }
  } else if (input.list === 'unpaid') {
    listWhere = {
      and: [
        { status: { in: [...OPEN_STATUSES, 'completed'] } },
        { paymentStatus: { equals: 'unpaid' } },
      ],
    }
  } else if (input.list === 'earlier') {
    const { today } = await getTenantRestaurantSettings(payload, input.tenantId)
    listWhere = {
      and: [{ status: { in: OPEN_STATUSES } }, { orderDate: { less_than: today } }],
    }
  } else {
    let targetDate = input.date
    if (!targetDate) {
      const { today } = await getTenantRestaurantSettings(payload, input.tenantId)
      targetDate = today
    }
    listWhere = {
      and: [{ status: { in: ['completed', 'cancelled'] } }, { orderDate: { equals: targetDate } }],
    }
  }

  const whereConditions: Where[] = [{ tenant: { equals: input.tenantId } }, listWhere]
  if (input.menuId !== undefined) {
    whereConditions.push({ menu: { equals: input.menuId } })
  }

  if (input.list !== 'history') {
    const { docs } = await payload.find({
      collection: 'orders',
      where: { and: whereConditions },
      sort: 'createdAt',
      pagination: false,
      depth: 1,
      overrideAccess: false,
      user,
    })

    payload.logger.debug({
      msg: 'board: list orders',
      userId: user.id,
      tenantId: input.tenantId,
      role: input.role,
      list: input.list,
      menuId: input.menuId,
      count: docs.length,
    })

    return {
      orders: docs,
      page: 1,
      totalPages: 1,
    }
  }

  const page = input.page ?? 1
  const result = await payload.find({
    collection: 'orders',
    where: { and: whereConditions },
    sort: '-createdAt',
    limit: HISTORY_PAGE_SIZE,
    page,
    depth: 1,
    overrideAccess: false,
    user,
  })

  payload.logger.debug({
    msg: 'board: list orders (history)',
    userId: user.id,
    tenantId: input.tenantId,
    role: input.role,
    list: input.list,
    menuId: input.menuId,
    page: result.page ?? page,
    totalPages: result.totalPages ?? 1,
    count: result.docs.length,
  })

  return {
    orders: result.docs,
    page: result.page ?? page,
    totalPages: result.totalPages ?? 1,
  }
}

/**
 * Payments marked `refundDue` (an online payment the order didn't need, phase 2) of the tenant,
 * for the cashier's "Refund due" list. Cashier role required (403); `payload.find` payments as
 * the user, depth 0, newest first.
 */
export const listRefundDue = async (
  payload: Payload,
  user: User,
  tenantId: number,
): Promise<Payment[]> => {
  const roles = staffRolesFor(user, tenantId)
  if (!roles.includes('cashier')) {
    payload.logger.warn({
      msg: 'board: list refund due refused, not a cashier',
      userId: user.id,
      tenantId,
    })
    throw new APIError('Only cashiers may view refund due payments', 403, undefined, true)
  }

  const { docs } = await payload.find({
    collection: 'payments',
    where: {
      and: [{ tenant: { equals: tenantId } }, { refundDue: { equals: true } }],
    },
    depth: 0,
    sort: '-createdAt',
    pagination: false,
    overrideAccess: false,
    user,
  })

  payload.logger.debug({
    msg: 'board: list refund due',
    userId: user.id,
    tenantId,
    count: docs.length,
  })

  return docs
}

/**
 * A status move from a board (forward, Move back, Cancel, the undo toast).
 * `payload.update` the order as the user with `{ status, cancelReason }`: `transitionGuard`
 * decides (400 a move that doesn't exist, 403 the wrong person), the stamps, broadcast and audit
 * follow from the order's hooks. `info` log with order id, from → to, user id.
 */
export const moveOrder = async (
  payload: Payload,
  user: User,
  input: MoveOrderInput,
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

  const updatedOrder = await payload.update({
    collection: 'orders',
    id: input.orderId,
    data: {
      status: input.status,
      ...(input.cancelReason !== undefined ? { cancelReason: input.cancelReason } : {}),
    },
    overrideAccess: false,
    user,
  })

  payload.logger.info({
    msg: 'order: moved',
    orderId: updatedOrder.id,
    tenantId,
    userId: user.id,
    from: order.status,
    to: input.status,
  })

  return updatedOrder
}

/**
 * Take payment on the cashier board: `payload.create` a payment as the user with
 * `{ order, method, status: 'succeeded', received, reference, remarks }`; `validatePayment` sets
 * the amount from the order (one payment for the total, phase 2) and refuses a second one,
 * `syncOrderPayment` updates the order. `info` log with order id, method, user id.
 */
export const recordPayment = async (
  payload: Payload,
  user: User,
  input: RecordPaymentInput,
): Promise<Payment> => {
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

  const payment = await payload.create({
    collection: 'payments',
    data: {
      order: input.orderId,
      method: input.method,
      status: 'succeeded',
      ...(input.received !== undefined ? { received: input.received } : {}),
      ...(input.reference !== undefined ? { reference: input.reference } : {}),
      ...(input.remarks !== undefined ? { remarks: input.remarks } : {}),
      ...(tenantId !== null ? { tenant: tenantId } : {}),
    },
    overrideAccess: false,
    user,
  })

  payload.logger.info({
    msg: 'payment: recorded',
    orderId: input.orderId,
    paymentId: payment.id,
    tenantId,
    userId: user.id,
    method: input.method,
  })

  return payment
}

/**
 * Void a payment: `payload.update` the payment as the user with
 * `{ status: 'voided', voidReason }` (the payment's hooks refuse anything else on a succeeded
 * payment and resync the order). Empty reason → ValidationError on `voidReason`.
 */
export const voidPayment = async (
  payload: Payload,
  user: User,
  input: VoidPaymentInput,
): Promise<Payment> => {
  const reason = input.reason?.trim()
  if (!reason) {
    payload.logger.warn({
      msg: 'payment: void refused, empty reason',
      paymentId: input.paymentId,
      userId: user.id,
    })
    throw new ValidationError({
      collection: 'payments',
      errors: [{ path: 'voidReason', message: 'Give a reason to void the payment.' }],
    })
  }

  const payment = await payload.findByID({
    collection: 'payments',
    id: input.paymentId,
    overrideAccess: false,
    user,
    depth: 0,
  })

  if (!payment) {
    throw new NotFound()
  }

  const tenantId = extractTenantId(payment.tenant)
  const orderId = typeof payment.order === 'number' ? payment.order : payment.order.id

  const updated = await payload.update({
    collection: 'payments',
    id: input.paymentId,
    data: {
      status: 'voided',
      voidReason: reason,
    },
    overrideAccess: false,
    user,
  })

  payload.logger.info({
    msg: 'payment: voided',
    paymentId: updated.id,
    orderId,
    tenantId,
    userId: user.id,
    reason,
  })

  return updated
}

/**
 * Staff handled a guest's Call staff / Ask for the bill. The stamps are `serverOnly`, so:
 * 1. `payload.findByID` the order as the user (not found / no access → NotFound), as `closeOrder`
 * 2. the user needs a staff role in the order's tenant (403 otherwise; user 2026-11-05: the
 *    kitchen may clear a staff call too)
 * 3. `payload.update` with `overrideAccess: true` and `user` (so updatedBy and the audit log name
 *    them), setting the `kind`'s field to null (`assistanceRequestedAt` / `billRequestedAt`); broadcast follows
 * 4. `info` log with order id, kind, user id
 */
export const clearAssistance = async (
  payload: Payload,
  user: User,
  input: ClearAssistanceInput,
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
  const roles = tenantId === null ? [] : staffRolesFor(user, tenantId)
  if (roles.length === 0) {
    payload.logger.warn({
      msg: 'order: clear assistance refused, no staff roles',
      orderId: order.id,
      tenantId,
      userId: user.id,
      kind: input.kind,
    })
    throw new APIError('You do not work on any board of this business', 403, undefined, true)
  }

  const data: Partial<Order> =
    input.kind === 'staff' ? { assistanceRequestedAt: null } : { billRequestedAt: null }

  const updatedOrder = await payload.update({
    collection: 'orders',
    id: input.orderId,
    data,
    overrideAccess: true,
    user,
  })

  payload.logger.info({
    msg: 'order: assistance cleared',
    orderId: updatedOrder.id,
    tenantId,
    userId: user.id,
    kind: input.kind,
  })

  return updatedOrder
}
