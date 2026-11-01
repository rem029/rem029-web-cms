import { createHash, randomBytes } from 'node:crypto'

import type { Payload } from 'payload'

import { DEFAULT_CURRENCY } from '@/collections/Settings/fields/currency'
import { extractTenantId } from '@/common/utils/tenantCollections'
import type { Order } from '@/payload-types'

/**
 * A guest's view of their own order (rem0018 phase 3 step 1): what the tracker shows, never
 * staff-only data (notes stay, they're the guest's own; no token hash, no staff, no payments
 * list). Line and add-on prices are `null` when the menu hid prices; the total always shows (the
 * guest has to pay it). Amounts are minor units in `currency`.
 */
export type GuestOrderLine = {
  title: string
  quantity: number
  unitPrice: number | null
  lineTotal: number | null
  options: { label: string; price: number | null }[]
}

export type GuestOrder = {
  id: number
  orderNumber: number | null
  status: Order['status']
  paymentStatus: Order['paymentStatus']
  table: string | null
  guestName: string | null
  notes: string | null
  lines: GuestOrderLine[]
  total: number
  currency: string
  showPrices: boolean
  createdAt: string
  assistanceRequestedAt: string | null
  billRequestedAt: string | null
  /** once paid: the succeeded payment's method, amount and time */
  receipt: { method: 'cash' | 'card' | 'online'; amount: number; paidAt: string } | null
}

/** A new guest token (shown to the guest once) and the hash stored on the order. */
export const newGuestToken = (): { token: string; hash: string } => {
  const token = randomBytes(32).toString('base64url')
  return { token, hash: hashGuestToken(token) }
}

/** sha256 hex of the token: what `orders.guestTokenHash` stores. */
export const hashGuestToken = (token: string): string => {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * The order a guest may act on: one `where` on id + the host's tenant + the token's hash
 * (plan, real time, improvement 2), read with overrideAccess (guests aren't users). `null` for
 * anything else (no tenant, a bad id, an empty or wrong token): callers answer 404 and never say
 * whether the order exists.
 */
export const findGuestOrder = async (
  payload: Payload,
  args: { tenantId: number | null; orderId: number; token: string },
): Promise<Order | null> => {
  if (
    args.tenantId === null ||
    !Number.isInteger(args.orderId) ||
    args.orderId <= 0 ||
    !args.token ||
    typeof args.token !== 'string' ||
    args.token.length > 100
  ) {
    return null
  }

  const hash = hashGuestToken(args.token)
  const { docs } = await payload.find({
    collection: 'orders',
    where: {
      and: [
        { id: { equals: args.orderId } },
        { tenant: { equals: args.tenantId } },
        { guestTokenHash: { equals: hash } },
      ],
    },
    depth: 0,
    limit: 1,
    overrideAccess: true,
  })

  const order = docs[0] ?? null
  if (!order) {
    payload.logger.debug({
      msg: 'guest order: not found',
      orderId: args.orderId,
      tenantId: args.tenantId,
    })
    return null
  }

  return order
}

/**
 * The guest snapshot of an order: lines from the order's own snapshot (never the catalog), the
 * table's label, prices dropped when `showPrices` is off, and the receipt from its succeeded
 * payment once `paymentStatus` is paid.
 */
export const toGuestOrder = async (payload: Payload, order: Order): Promise<GuestOrder> => {
  let tableLabel: string | null = null
  if (order.table && typeof order.table === 'object' && 'label' in order.table) {
    if (typeof order.table.label === 'string') {
      tableLabel = order.table.label
    }
  } else {
    const tableId = extractTenantId(order.table)
    if (tableId !== null) {
      const tableDoc = await payload.findByID({
        collection: 'tables',
        id: tableId,
        depth: 0,
        overrideAccess: true,
        disableErrors: true,
      })
      if (tableDoc && typeof tableDoc.label === 'string') {
        tableLabel = tableDoc.label
      }
    }
  }

  const showPrices = order.showPrices !== false
  const lines: GuestOrderLine[] = (order.items ?? []).map((item) => ({
    title: item.title ?? '',
    quantity: item.quantity,
    unitPrice: showPrices ? (item.unitPrice ?? null) : null,
    lineTotal: showPrices ? (item.lineTotal ?? null) : null,
    options: (item.selectedOptions ?? []).map((opt) => ({
      label: opt.label ?? '',
      price: showPrices ? (opt.price ?? null) : null,
    })),
  }))

  let receipt: GuestOrder['receipt'] = null
  if (order.paymentStatus === 'paid') {
    const { docs: payments } = await payload.find({
      collection: 'payments',
      where: {
        and: [{ order: { equals: order.id } }, { status: { equals: 'succeeded' } }],
      },
      sort: '-createdAt',
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const payment = payments[0]
    if (
      payment &&
      typeof payment.amount === 'number' &&
      (payment.method === 'cash' || payment.method === 'card' || payment.method === 'online')
    ) {
      receipt = {
        method: payment.method,
        amount: payment.amount,
        paidAt: payment.updatedAt,
      }
    }
  }

  return {
    id: order.id,
    orderNumber: order.orderNumber ?? null,
    status: order.status,
    paymentStatus: order.paymentStatus,
    table: tableLabel,
    guestName: order.guestName ?? null,
    notes: order.notes ?? null,
    lines,
    total: order.total ?? 0,
    currency: order.currency ?? DEFAULT_CURRENCY,
    showPrices,
    createdAt: order.createdAt,
    assistanceRequestedAt: order.assistanceRequestedAt ?? null,
    billRequestedAt: order.billRequestedAt ?? null,
    receipt,
  }
}
