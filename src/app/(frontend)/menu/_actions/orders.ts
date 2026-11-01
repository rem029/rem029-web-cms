'use server'

import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { getPayload } from 'payload'

import { getFrontendTenantId } from '@/common/utils/frontendTenant'
import type { GuestOrder } from '@/common/utils/guestOrder'
import type { OrderTable } from '@/common/utils/orderTables'

import {
  cancelOrder,
  getOrderStatus,
  listMenuTables,
  payOnline,
  placeOrder,
  requestAssistance,
  resolveTable,
  type GuestContext,
  type GuestOrderArgs,
  type GuestResult,
  type PlaceOrderArgs,
} from '../_data/guestOrders'
import { toLocale } from '../_data/locale'

/**
 * The guest ordering actions (rem0018 phase 3 step 1): thin wrappers over `../_data/guestOrders.ts`.
 * Each builds the `GuestContext` from the request (tenant from the host, ip only behind a trusted
 * proxy, locale from the visitor's) and passes the client's arguments through untrusted: the
 * data functions check them.
 */

const guestContext = async (locale: unknown): Promise<GuestContext> => {
  const tenantId = await getFrontendTenantId()
  const reqHeaders = await headers()
  let ip: string | null = null
  if (process.env.TRUST_PROXY === 'true') {
    const forwarded = reqHeaders.get('x-forwarded-for')
    if (forwarded) {
      const first = forwarded.split(',')[0]?.trim()
      if (first && first.length <= 64) {
        ip = first
      }
    }
  }
  return {
    tenantId,
    ip,
    locale: toLocale(locale),
  }
}

export const resolveTableAction = async (args: {
  menuSlug: string
  tableSlug: string
  locale: string
}): Promise<GuestResult<{ table: OrderTable }>> => {
  const payload = await getPayload({ config: configPromise })
  const context = await guestContext(args.locale)
  return resolveTable(payload, context, args)
}

export const listMenuTablesAction = async (args: {
  menuSlug: string
  locale: string
}): Promise<GuestResult<{ tables: OrderTable[] }>> => {
  const payload = await getPayload({ config: configPromise })
  const context = await guestContext(args.locale)
  return listMenuTables(payload, context, args)
}

export const placeOrderAction = async (
  args: PlaceOrderArgs & { locale: string },
): Promise<GuestResult<{ orderId: number; orderNumber: number; guestToken: string }>> => {
  const payload = await getPayload({ config: configPromise })
  const context = await guestContext(args.locale)
  return placeOrder(payload, context, args)
}

export const getOrderStatusAction = async (
  args: GuestOrderArgs,
): Promise<GuestResult<{ order: GuestOrder }>> => {
  const payload = await getPayload({ config: configPromise })
  const context = await guestContext(undefined)
  return getOrderStatus(payload, context, args)
}

export const cancelOrderAction = async (
  args: GuestOrderArgs,
): Promise<GuestResult<{ order: GuestOrder }>> => {
  const payload = await getPayload({ config: configPromise })
  const context = await guestContext(undefined)
  return cancelOrder(payload, context, args)
}

export const requestAssistanceAction = async (
  args: GuestOrderArgs & { kind: 'staff' | 'bill' },
): Promise<GuestResult<{ order: GuestOrder }>> => {
  if (args.kind !== 'staff' && args.kind !== 'bill') {
    return { ok: false, status: 400, error: 'invalidOrder' }
  }
  const payload = await getPayload({ config: configPromise })
  const context = await guestContext(undefined)
  return requestAssistance(payload, context, args)
}

export const payOnlineAction = async (
  args: GuestOrderArgs,
): Promise<GuestResult<{ redirectUrl: string }>> => {
  const payload = await getPayload({ config: configPromise })
  const context = await guestContext(undefined)
  return payOnline(payload, context, args)
}
