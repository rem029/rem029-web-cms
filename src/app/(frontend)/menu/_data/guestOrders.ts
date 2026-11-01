import { APIError, ValidationError, type Payload, type TypedLocale } from 'payload'

import {
  findGuestOrder,
  newGuestToken,
  toGuestOrder,
  type GuestOrder,
} from '@/common/utils/guestOrder'
import { resolveOrderTable, type OrderTable } from '@/common/utils/orderTables'
import { startOnlinePayment } from '@/common/utils/payments/startOnlinePayment'
import { extractTenantId } from '@/common/utils/tenantCollections'
import type { Menu } from '@/payload-types'

import { allowHit } from './rateLimit'

/**
 * What guests do on a menu with ordering on (rem0018 phase 3 step 1), as typed functions the
 * server actions (`../_actions/orders.ts`) call and the tests call directly. Guests aren't users:
 * every read and write is server code with overrideAccess, so each function checks, in order:
 * the host's tenant (`context.tenantId`, from the request, never the client) → a **published**
 * menu of that tenant with ordering on → the table on that menu (`resolveOrderTable`) or the order
 * with its token (`findGuestOrder`). Prices come from the catalog only (the orders hooks), the
 * order's status rules from `transitions.ts` (a call without a user is the guest). Refusals are
 * logged at warn with the tenant id, menu slug and table or order id, never the token.
 */

/** Who is asking: the host's tenant and, behind a trusted proxy, the guest's ip. */
export type GuestContext = {
  tenantId: number | null
  ip: string | null
  locale?: TypedLocale
}

/** Keys the guest pages translate (en / ar, step 2), never staff wording. */
export type GuestError =
  | 'menuNotFound'
  | 'orderingOff'
  | 'tableNotOnMenu'
  | 'itemUnavailable'
  | 'invalidOrder'
  | 'closed'
  | 'tooManyOrders'
  | 'orderNotFound'
  | 'cannotCancel'
  | 'orderClosed'
  | 'tooSoon'
  | 'onlinePaymentUnavailable'
  | 'failed'

export type GuestResult<T> =
  | ({ ok: true } & T)
  | { ok: false; status: 400 | 403 | 404 | 429 | 500; error: GuestError }

/** A cart line as the guest's browser sends it: ids and a quantity, never a price or title. */
export type CartLine = {
  itemId: number
  quantity: number
  /** the chosen choices' row ids on the item (`modifierGroups[].options[].id`) */
  optionIds: string[]
}

export type PlaceOrderArgs = {
  menuSlug: string
  tableSlug: string
  guestName?: string
  notes?: string
  lines: CartLine[]
}

export type GuestOrderArgs = { orderId: number; token: string }

/** Orders per ip + table (or per table without a trusted ip) in `PLACE_ORDER_WINDOW_MS`. */
export const PLACE_ORDER_LIMIT = 5
export const PLACE_ORDER_WINDOW_MS = 10 * 60 * 1000
/** One Call staff (and one Ask for the bill) per order in this time. */
export const ASSISTANCE_INTERVAL_MS = 60 * 1000
/** Lines per order and quantity per line the guest may send. */
export const MAX_LINES = 50
export const MAX_QUANTITY = 99

const orderingMenu = async (
  payload: Payload,
  context: GuestContext,
  menuSlug: string,
): Promise<GuestResult<{ menu: Menu; tenantId: number }>> => {
  if (context.tenantId === null || !menuSlug) {
    payload.logger.warn({
      msg: 'orderingMenu: missing tenant or menuSlug',
      tenantId: context.tenantId,
      menuSlug,
    })
    return { ok: false, status: 404, error: 'menuNotFound' }
  }

  const { docs: menus } = await payload.find({
    collection: 'menus',
    where: {
      and: [
        { tenant: { equals: context.tenantId } },
        { slug: { equals: menuSlug } },
        { _status: { equals: 'published' } },
      ],
    },
    draft: false,
    depth: 0,
    limit: 1,
    overrideAccess: false,
    locale: context.locale,
  })

  const menu = menus[0]
  if (!menu) {
    payload.logger.warn({
      msg: 'orderingMenu: menu not found',
      tenantId: context.tenantId,
      menuSlug,
    })
    return { ok: false, status: 404, error: 'menuNotFound' }
  }

  if (!menu.ordering?.enabled) {
    payload.logger.warn({
      msg: 'orderingMenu: ordering off',
      tenantId: context.tenantId,
      menuSlug,
    })
    return { ok: false, status: 403, error: 'orderingOff' }
  }

  return { ok: true, menu, tenantId: context.tenantId }
}

/** The table of a QR code on this menu, for the menu page's `?table=` (step 2). */
export const resolveTable = async (
  payload: Payload,
  context: GuestContext,
  args: { menuSlug: string; tableSlug: string },
): Promise<GuestResult<{ table: OrderTable }>> => {
  const menuResult = await orderingMenu(payload, context, args.menuSlug)
  if (!menuResult.ok) return menuResult

  const table = await resolveOrderTable(payload, {
    tenantId: menuResult.tenantId,
    menuId: menuResult.menu.id,
    tableSlug: args.tableSlug,
    locale: context.locale,
  })
  if (!table) {
    payload.logger.warn({
      msg: 'resolveTable: table not on menu',
      tenantId: context.tenantId,
      menuSlug: args.menuSlug,
      tableSlug: args.tableSlug,
    })
    return { ok: false, status: 400, error: 'tableNotOnMenu' }
  }

  return { ok: true, table }
}

/** The menu's active tables by sort order, for the table picker. */
export const listMenuTables = async (
  payload: Payload,
  context: GuestContext,
  args: { menuSlug: string },
): Promise<GuestResult<{ tables: OrderTable[] }>> => {
  const menuResult = await orderingMenu(payload, context, args.menuSlug)
  if (!menuResult.ok) return menuResult

  const { docs: tableDocs } = await payload.find({
    collection: 'tables',
    where: {
      and: [
        { tenant: { equals: context.tenantId } },
        { menu: { equals: menuResult.menu.id } },
        { isActive: { equals: true } },
      ],
    },
    sort: 'sortOrder',
    depth: 0,
    overrideAccess: true,
    pagination: false,
    locale: context.locale,
  })

  const tables: OrderTable[] = tableDocs.map((t) => ({
    id: t.id,
    slug: t.slug ?? '',
    label: t.label,
  }))

  return { ok: true, tables }
}

/**
 * Places the guest's order. Returns the token once: the browser keeps it (`orders-mine`, step
 * 2), the order stores only its hash.
 */
export const placeOrder = async (
  payload: Payload,
  context: GuestContext,
  args: PlaceOrderArgs,
): Promise<GuestResult<{ orderId: number; orderNumber: number; guestToken: string }>> => {
  if (!Array.isArray(args.lines) || args.lines.length < 1 || args.lines.length > MAX_LINES) {
    return { ok: false, status: 400, error: 'invalidOrder' }
  }

  for (const line of args.lines) {
    if (
      !line ||
      typeof line.itemId !== 'number' ||
      !Number.isInteger(line.itemId) ||
      line.itemId <= 0 ||
      typeof line.quantity !== 'number' ||
      !Number.isInteger(line.quantity) ||
      line.quantity < 1 ||
      line.quantity > MAX_QUANTITY ||
      !Array.isArray(line.optionIds) ||
      line.optionIds.length > 20 ||
      line.optionIds.some((id) => typeof id !== 'string')
    ) {
      return { ok: false, status: 400, error: 'invalidOrder' }
    }
  }

  const menuResult = await orderingMenu(payload, context, args.menuSlug)
  if (!menuResult.ok) return menuResult

  const table = await resolveOrderTable(payload, {
    tenantId: menuResult.tenantId,
    menuId: menuResult.menu.id,
    tableSlug: args.tableSlug,
    locale: context.locale,
  })
  if (!table) {
    payload.logger.warn({
      msg: 'placeOrder: table not on menu',
      tenantId: context.tenantId,
      menuSlug: args.menuSlug,
      tableSlug: args.tableSlug,
    })
    return { ok: false, status: 400, error: 'tableNotOnMenu' }
  }

  const now = Date.now()
  const key = `order:${context.ip ?? '-'}:${table.id}`
  if (!allowHit(key, PLACE_ORDER_LIMIT, PLACE_ORDER_WINDOW_MS, now)) {
    payload.logger.warn({
      msg: 'placeOrder: rate limit exceeded',
      tenantId: context.tenantId,
      menuSlug: args.menuSlug,
      tableId: table.id,
    })
    return { ok: false, status: 429, error: 'tooManyOrders' }
  }

  const { token, hash } = newGuestToken()
  const guestName = args.guestName?.trim().slice(0, 120) || undefined
  const notes = args.notes?.trim().slice(0, 500) || undefined

  const items = args.lines.map((line) => ({
    item: line.itemId,
    quantity: line.quantity,
    selectedOptions: line.optionIds.map((option) => ({ option })),
  }))

  try {
    const order = await payload.create({
      collection: 'orders',
      data: {
        tenant: menuResult.tenantId,
        menu: menuResult.menu.id,
        table: table.id,
        source: 'guest',
        type: 'dine_in',
        status: 'pending',
        paymentStatus: 'unpaid',
        guestName,
        notes,
        guestTokenHash: hash,
        items,
      },
      overrideAccess: true,
      context: { disableRevalidate: true },
      locale: context.locale,
    })

    payload.logger.info({
      msg: 'guest order: placed',
      tenantId: context.tenantId,
      menuSlug: args.menuSlug,
      tableId: table.id,
      orderId: order.id,
    })

    return {
      ok: true,
      orderId: order.id,
      orderNumber: order.orderNumber ?? 0,
      guestToken: token,
    }
  } catch (err) {
    if (err instanceof ValidationError) {
      payload.logger.warn({
        msg: 'placeOrder: validation error',
        tenantId: context.tenantId,
        menuSlug: args.menuSlug,
        tableId: table.id,
      })
      return { ok: false, status: 400, error: 'itemUnavailable' }
    }
    if (err instanceof APIError && err.status === 403) {
      payload.logger.warn({
        msg: 'placeOrder: restaurant closed',
        tenantId: context.tenantId,
        menuSlug: args.menuSlug,
        tableId: table.id,
      })
      return { ok: false, status: 403, error: 'closed' }
    }
    payload.logger.error({
      msg: 'placeOrder: failed',
      tenantId: context.tenantId,
      menuSlug: args.menuSlug,
      tableId: table.id,
      err,
    })
    return { ok: false, status: 500, error: 'failed' }
  }
}

/** The guest snapshot of their order (the tracker's baseline, refetched on every reconnect). */
export const getOrderStatus = async (
  payload: Payload,
  context: GuestContext,
  args: GuestOrderArgs,
): Promise<GuestResult<{ order: GuestOrder }>> => {
  const order = await findGuestOrder(payload, {
    tenantId: context.tenantId,
    orderId: args.orderId,
    token: args.token,
  })
  if (!order) {
    return { ok: false, status: 404, error: 'orderNotFound' }
  }

  const guestOrder = await toGuestOrder(payload, order)
  return { ok: true, order: guestOrder }
}

/** Cancels the guest's order while it's pending (`checkMove`: guests cancel from pending only). */
export const cancelOrder = async (
  payload: Payload,
  context: GuestContext,
  args: GuestOrderArgs,
): Promise<GuestResult<{ order: GuestOrder }>> => {
  const order = await findGuestOrder(payload, {
    tenantId: context.tenantId,
    orderId: args.orderId,
    token: args.token,
  })
  if (!order) {
    return { ok: false, status: 404, error: 'orderNotFound' }
  }

  try {
    const updated = await payload.update({
      collection: 'orders',
      id: order.id,
      data: { status: 'cancelled' },
      overrideAccess: true,
      context: { disableRevalidate: true },
    })

    payload.logger.info({
      msg: 'guest order: cancelled',
      tenantId: context.tenantId,
      orderId: order.id,
    })

    const guestOrder = await toGuestOrder(payload, updated)
    return { ok: true, order: guestOrder }
  } catch (err) {
    if ((err instanceof APIError && err.status === 403) || err instanceof ValidationError) {
      payload.logger.warn({
        msg: 'cancelOrder: cannot cancel',
        tenantId: context.tenantId,
        orderId: order.id,
      })
      return { ok: false, status: 403, error: 'cannotCancel' }
    }
    payload.logger.error({
      msg: 'cancelOrder: failed',
      tenantId: context.tenantId,
      orderId: order.id,
      err,
    })
    return { ok: false, status: 500, error: 'failed' }
  }
}

/**
 * Call staff (`staff`) or Ask for the bill (`bill`): stamps `assistanceRequestedAt` or
 * `billRequestedAt` on the order, which the waiter and cashier boards (phase 4) show and clear.
 * At most once per `ASSISTANCE_INTERVAL_MS` per order and kind (the stamp itself is the limit, so
 * it holds across restarts).
 */
export const requestAssistance = async (
  payload: Payload,
  context: GuestContext,
  args: GuestOrderArgs & { kind: 'staff' | 'bill' },
): Promise<GuestResult<{ order: GuestOrder }>> => {
  const order = await findGuestOrder(payload, {
    tenantId: context.tenantId,
    orderId: args.orderId,
    token: args.token,
  })
  if (!order) {
    return { ok: false, status: 404, error: 'orderNotFound' }
  }

  if (order.status === 'cancelled' || order.status === 'completed') {
    return { ok: false, status: 400, error: 'orderClosed' }
  }

  const field = args.kind === 'staff' ? 'assistanceRequestedAt' : 'billRequestedAt'
  const stamp = order[field]
  if (stamp) {
    const stampTime = new Date(stamp).getTime()
    if (Date.now() - stampTime < ASSISTANCE_INTERVAL_MS) {
      return { ok: false, status: 429, error: 'tooSoon' }
    }
  }

  const updated = await payload.update({
    collection: 'orders',
    id: order.id,
    data: { [field]: new Date().toISOString() },
    overrideAccess: true,
    context: { disableRevalidate: true },
  })

  payload.logger.info({
    msg: 'guest order: assistance requested',
    tenantId: context.tenantId,
    orderId: order.id,
    kind: args.kind,
  })

  const guestOrder = await toGuestOrder(payload, updated)
  return { ok: true, order: guestOrder }
}

/**
 * Pay now: the guest's online checkout through the business's provider (phase 2's
 * `startOnlinePayment`), after the token check. The return address is the order's menu page,
 * built here, never sent by the client.
 */
export const payOnline = async (
  payload: Payload,
  context: GuestContext,
  args: GuestOrderArgs,
): Promise<GuestResult<{ redirectUrl: string }>> => {
  const order = await findGuestOrder(payload, {
    tenantId: context.tenantId,
    orderId: args.orderId,
    token: args.token,
  })
  if (!order) {
    return { ok: false, status: 404, error: 'orderNotFound' }
  }

  const menuId = extractTenantId(order.menu)
  if (menuId === null) {
    return { ok: false, status: 400, error: 'onlinePaymentUnavailable' }
  }

  const menu = await payload.findByID({
    collection: 'menus',
    id: menuId,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
  })
  if (!menu || !menu.slug) {
    return { ok: false, status: 400, error: 'onlinePaymentUnavailable' }
  }

  const returnUrl = `/menu/${menu.slug}?order=${order.id}`
  const result = await startOnlinePayment(payload, {
    orderId: order.id,
    returnUrl,
  })

  if (!result.ok) {
    payload.logger.warn({
      msg: 'payOnline: payment provider unavailable',
      tenantId: context.tenantId,
      orderId: order.id,
      err: result.message,
    })
    return { ok: false, status: 400, error: 'onlinePaymentUnavailable' }
  }

  return { ok: true, redirectUrl: result.redirectUrl }
}
