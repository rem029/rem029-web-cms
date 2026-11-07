'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type { BoardContext } from '@/collections/Orders/utils/board'
import { DEFAULT_ORDER_FLOW } from '@/collections/Menus/fields/orderFlows'
import type { OrderStatus } from '@/collections/Orders/utils/statuses'
import type { StaffRole } from '@/common/utils/staffRoles'
import type { Order, Payment } from '@/payload-types'

import { listBoardOrdersAction, listRefundDueAction } from './actions'
import type { BoardTab } from './useBoardSettings'
import type { OrderStreamEvent } from './useOrderStream'

export type BoardOrders = {
  orders: Order[]
  // the Refund due tab lists payments, not orders
  payments: Payment[]
  loading: boolean
  // a failed load, in plain words ("Couldn't load the orders. Try again.")
  error: string | null
  // history paging
  page: number
  totalPages: number
  setPage: (page: number) => void
  // history: the business day shown, ‹ › step through days
  date: string
  setDate: (date: string) => void
  refetch: () => void
  // a stream frame: replace or add the order, drop it when it no longer belongs to the tab
  applyEvent: (event: OrderStreamEvent) => void
  // after a move or payment: the saved order from the action, shown at once
  replaceOrder: (order: Order) => void
}

const OPEN_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'prepared', 'served']

/** Puts `order` in the list (replacing it) when it belongs there, else takes it out; oldest first. */
const upsertOrder = (list: Order[], order: Order, belongs: boolean): Order[] => {
  const without = list.filter((o) => o.id !== order.id)
  return belongs ? [...without, order].sort(sortByCreatedAt) : without
}

const sortByCreatedAt = (a: Order, b: Order): number =>
  new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()

/**
 * Mirrors `listBoardOrders` active `where` in `src/collections/Orders/utils/board.ts` (lines 244-268).
 */
export const belongsToTab = (role: StaffRole, order: Order, menuId: number | null): boolean => {
  if (menuId !== null) {
    const orderMenuId =
      typeof order.menu === 'object' && order.menu !== null ? order.menu.id : order.menu
    if (orderMenuId !== menuId) {
      return false
    }
  }

  if (role === 'waiter') {
    return OPEN_STATUSES.includes(order.status)
  }

  if (role === 'kitchen') {
    return (
      order.status === 'confirmed' || order.status === 'preparing' || order.status === 'prepared'
    )
  }

  // role === 'cashier'
  const isServedUnpaid =
    order.status === 'served' &&
    order.paymentStatus === 'unpaid' &&
    (order.flow ?? DEFAULT_ORDER_FLOW) === 'waiter_kitchen_cashier'
  const isBillRequested = OPEN_STATUSES.includes(order.status) && Boolean(order.billRequestedAt)

  return isServedUnpaid || isBillRequested
}

/**
 * The list a board shows (rem0018 phase 4 step 2a): baseline through `listBoardOrdersAction`
 * (or `listRefundDueAction` for `refundDue`), changes from the stream.
 * 1. load on mount and whenever tab, menuId, date or page change (stale answers ignored)
 * 2. `applyEvent`: only on `active` (history / cashier lists refetch instead, they are filtered by
 *    date or payment): `belongsToTab(role, order, menuId)` → upsert, else remove; keep oldest first
 * 3. `refetch` from the stream's `onOpen`
 * `belongsToTab` mirrors `listBoardOrders`'s `active` where (kept here, client side, next to it a
 * comment pointing at board.ts).
 */
export const useBoardOrders = (args: {
  context: BoardContext
  role: StaffRole
  tab: BoardTab
  menuId: number | null
}): BoardOrders => {
  const { context, role, tab, menuId } = args

  const [orders, setOrders] = useState<Order[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalPages, setTotalPages] = useState(1)
  const [date, setDateState] = useState(context.today)

  // the history page belongs to one tab / menu / day: another one starts on page 1
  const pageKey = `${tab}|${menuId ?? 'all'}|${date}`
  const [pageState, setPageState] = useState({ key: pageKey, page: 1 })
  const currentPage = pageState.key === pageKey ? pageState.page : 1
  const setPage = useCallback((page: number) => setPageState({ key: pageKey, page }), [pageKey])

  const reqIdRef = useRef(0)
  const [fetchTrigger, setFetchTrigger] = useState(0)
  const refetch = useCallback(() => {
    setFetchTrigger((c) => c + 1)
  }, [])

  useEffect(() => {
    const reqId = ++reqIdRef.current
    setLoading(true)
    setError(null)

    const run = async () => {
      try {
        if (tab === 'refundDue') {
          const res = await listRefundDueAction(context.tenantId)
          if (reqId !== reqIdRef.current) return
          if (res.ok) {
            setPayments(res.data)
            setOrders([])
            setTotalPages(1)
            setLoading(false)
          } else {
            console.warn('listRefundDueAction failed', res)
            setError("Couldn't load the orders. Try again.")
            setLoading(false)
          }
        } else {
          const res = await listBoardOrdersAction({
            tenantId: context.tenantId,
            role,
            list: tab,
            menuId: menuId ?? undefined,
            date: tab === 'history' ? date || context.today : undefined,
            page: tab === 'history' ? currentPage : undefined,
          })
          if (reqId !== reqIdRef.current) return
          if (res.ok) {
            setOrders(res.data.orders)
            setPayments([])
            setTotalPages(res.data.totalPages)
            setLoading(false)
          } else {
            console.warn('listBoardOrdersAction failed', res)
            setError("Couldn't load the orders. Try again.")
            setLoading(false)
          }
        }
      } catch (err) {
        if (reqId !== reqIdRef.current) return
        console.warn('fetch board orders threw', err)
        setError("Couldn't load the orders. Try again.")
        setLoading(false)
      }
    }

    void run()
  }, [context.tenantId, context.today, role, tab, menuId, date, currentPage, fetchTrigger])

  const applyEvent = useCallback(
    (event: OrderStreamEvent) => {
      if (tab !== 'active') {
        refetch()
        return
      }
      const belongs = belongsToTab(role, event.order, menuId)
      setOrders((prev) => upsertOrder(prev, event.order, belongs))
    },
    [tab, role, menuId, refetch],
  )

  const replaceOrder = useCallback(
    (order: Order) => {
      // on other tabs the order stays where it is (the list refetches from the stream)
      const belongs = tab !== 'active' || belongsToTab(role, order, menuId)
      setOrders((prev) =>
        tab === 'active'
          ? upsertOrder(prev, order, belongs)
          : prev.map((o) => (o.id === order.id ? order : o)),
      )
    },
    [tab, role, menuId],
  )

  return {
    orders,
    payments,
    loading,
    error,
    page: currentPage,
    totalPages,
    setPage,
    date,
    setDate: setDateState,
    refetch,
    applyEvent,
    replaceOrder,
  }
}
