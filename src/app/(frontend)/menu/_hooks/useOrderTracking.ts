'use client'

import { useEffect, useState } from 'react'

import { getOrderStatusAction } from '@/app/(frontend)/menu/_actions/orders'
import type { GuestOrder } from '@/common/utils/guestOrder'

export type OrderTracking = {
  /** the latest snapshot, `undefined` until the first one arrives */
  order: GuestOrder | undefined
  /** the stream is open ("Live"); false while the browser reconnects ("Reconnecting…") */
  live: boolean
  /** the server answered 404 (wrong token, order gone): the caller drops it from "Your orders" */
  notFound: boolean
  /** after a guest action (cancel, call staff): show its returned snapshot at once */
  setOrder: (order: GuestOrder) => void
}

// a stream frame is this order's snapshot (the route sends `GuestOrder` json)
const isOrderFrame = (value: unknown, orderId: number): value is GuestOrder =>
  typeof value === 'object' &&
  value !== null &&
  'id' in value &&
  value.id === orderId &&
  'status' in value &&
  typeof value.status === 'string'

// the browser retries a dropped stream itself, but gives up for good on a non-200 answer (a
// proxy 502 while the server restarts): then we reopen it, 3 s doubling up to 30 s
const REOPEN_FIRST_MS = 3_000
const REOPEN_MAX_MS = 30_000

/**
 * One guest order, live (rem0018 phase 3 step 2b, plan "real time", sdq `useOrderTracking`):
 * the baseline through `getOrderStatusAction`, then an EventSource on
 * `/next/orders/track?order=<id>&token=<token>` (EventSource can't send headers; the route
 * never logs the url) whose `order` frames replace the snapshot. `onopen` refetches the
 * baseline, so a reconnect covers any gap; so does the tab coming back (`visibilitychange` to
 * visible: phones sleep, a suspended stream can miss frames). A stream the browser closed for
 * good is reopened by a timer (backoff), or at once when the tab comes back.
 */
export const useOrderTracking = (args: { orderId: number; token: string }): OrderTracking => {
  const { orderId, token } = args
  const [order, setOrder] = useState<GuestOrder | undefined>(undefined)
  const [live, setLive] = useState(false)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false

    const fetchBaseline = async () => {
      try {
        const result = await getOrderStatusAction({ orderId, token })
        if (cancelled) return
        if (result.ok) {
          setOrder(result.order)
        } else if (result.error === 'orderNotFound') {
          setNotFound(true)
        } else {
          console.warn('order status failed')
        }
      } catch {
        if (cancelled) return
        console.warn('order status failed')
      }
    }

    void fetchBaseline()

    const url = `/next/orders/track?order=${orderId}&token=${encodeURIComponent(token)}`
    let source: EventSource
    let reopenTimer: number | undefined
    let reopenDelay = REOPEN_FIRST_MS

    const reopen = () => {
      window.clearTimeout(reopenTimer)
      reopenTimer = undefined
      source.close()
      source.removeEventListener('order', handleOrder)
      connect()
    }

    const connect = () => {
      source = new EventSource(url)
      source.addEventListener('order', handleOrder)

      source.onopen = () => {
        if (cancelled) return
        reopenDelay = REOPEN_FIRST_MS
        setLive(true)
        void fetchBaseline()
      }

      source.onerror = () => {
        if (cancelled) return
        setLive(false)
        if (source.readyState !== EventSource.CLOSED || reopenTimer !== undefined) return
        console.warn('order stream closed, reopening', { orderId, inMs: reopenDelay })
        reopenTimer = window.setTimeout(reopen, reopenDelay)
        reopenDelay = Math.min(reopenDelay * 2, REOPEN_MAX_MS)
      }
    }

    const handleOrder = (event: Event) => {
      if (cancelled || !(event instanceof MessageEvent) || typeof event.data !== 'string') return
      try {
        const next: unknown = JSON.parse(event.data)
        if (isOrderFrame(next, orderId)) setOrder(next)
        else console.warn('order frame ignored')
      } catch {
        console.warn('order frame unreadable')
      }
    }

    connect()

    const handleVisibility = () => {
      if (cancelled || document.visibilityState !== 'visible') return
      if (source.readyState === EventSource.CLOSED) reopen()
      else void fetchBaseline()
    }

    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      cancelled = true
      window.clearTimeout(reopenTimer)
      source.close()
      source.removeEventListener('order', handleOrder)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [orderId, token])

  return { order, live, notFound, setOrder }
}
