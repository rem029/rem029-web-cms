'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type { Order } from '@/payload-types'

export type OrderStreamEvent = { type: 'created' | 'updated'; order: Order }

export type OrderStream = {
  // the stream is open ("Live"); false while it reconnects ("Disconnected")
  live: boolean
  // closes and opens the stream again at once (the "Force reconnect" button)
  reconnect: () => void
}

const isRecord = (val: unknown): val is Record<string, unknown> =>
  typeof val === 'object' && val !== null

const isOrderStreamEvent = (value: unknown): value is OrderStreamEvent => {
  if (!isRecord(value)) return false
  if (value.type !== 'created' && value.type !== 'updated') return false
  if (!isRecord(value.order)) return false
  if (typeof value.order.id !== 'number' || typeof value.order.status !== 'string') return false
  return true
}

const REOPEN_FIRST_MS = 3_000
const REOPEN_MAX_MS = 30_000

/**
 * The staff stream for one board (rem0018 phase 4 step 2a, plan "real time"): an EventSource on
 * `/next/orders/stream?tenant=<id>`, as `useOrderTracking` (phase 3) does for a guest:
 * 1. `order` frames → `onEvent({ type, order })` (parse + shape check, a bad frame `console.warn`)
 * 2. `onopen` → live true + `onOpen()` (the board refetches its list: covers any gap)
 * 3. `onerror` → live false; a stream the browser closed for good (readyState CLOSED: a proxy 502)
 *    is reopened after 3 s doubling to 30 s; `visibilitychange` to visible reopens a closed one
 * 4. `reconnect()` closes and opens at once (resets the backoff)
 * Callbacks are read through refs, so a new callback doesn't reopen the stream; the effect
 * depends on `tenantId` only.
 */
export const useOrderStream = (args: {
  tenantId: number
  onEvent: (event: OrderStreamEvent) => void
  onOpen: () => void
}): OrderStream => {
  const { tenantId, onEvent, onOpen } = args
  const [live, setLive] = useState(false)

  const onEventRef = useRef(onEvent)
  const onOpenRef = useRef(onOpen)
  useEffect(() => {
    onEventRef.current = onEvent
    onOpenRef.current = onOpen
  })

  const reconnectRef = useRef<() => void>(() => undefined)
  const reconnect = useCallback(() => {
    reconnectRef.current()
  }, [])

  useEffect(() => {
    let cancelled = false
    const url = `/next/orders/stream?tenant=${tenantId}`
    let source: EventSource
    let reopenTimer: number | undefined
    let reopenDelay = REOPEN_FIRST_MS

    const reopen = (resetBackoff: boolean) => {
      window.clearTimeout(reopenTimer)
      reopenTimer = undefined
      if (resetBackoff) {
        reopenDelay = REOPEN_FIRST_MS
      }
      source.close()
      source.removeEventListener('order', handleOrder)
      connect()
    }

    reconnectRef.current = () => {
      reopen(true)
    }

    const connect = () => {
      source = new EventSource(url)
      source.addEventListener('order', handleOrder)

      source.onopen = () => {
        if (cancelled) return
        reopenDelay = REOPEN_FIRST_MS
        setLive(true)
        onOpenRef.current()
      }

      source.onerror = () => {
        if (cancelled) return
        setLive(false)
        if (source.readyState !== EventSource.CLOSED || reopenTimer !== undefined) return
        console.warn('order stream closed, reopening', { tenantId, inMs: reopenDelay })
        reopenTimer = window.setTimeout(() => reopen(false), reopenDelay)
        reopenDelay = Math.min(reopenDelay * 2, REOPEN_MAX_MS)
      }
    }

    const handleOrder = (event: Event) => {
      if (cancelled || !(event instanceof MessageEvent) || typeof event.data !== 'string') return
      try {
        const next: unknown = JSON.parse(event.data)
        if (isOrderStreamEvent(next)) {
          onEventRef.current(next)
        } else {
          console.warn('order frame ignored')
        }
      } catch {
        console.warn('order frame unreadable')
      }
    }

    connect()

    const handleVisibility = () => {
      if (cancelled || document.visibilityState !== 'visible') return
      if (source.readyState === EventSource.CLOSED) {
        reopen(false)
      } else {
        onOpenRef.current()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      cancelled = true
      window.clearTimeout(reopenTimer)
      source.close()
      source.removeEventListener('order', handleOrder)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [tenantId])

  return { live, reconnect }
}
