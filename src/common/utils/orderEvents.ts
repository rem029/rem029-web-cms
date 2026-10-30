import type { Payload } from 'payload'

import type { Order } from '@/payload-types'

declare global {
  // eslint-disable-next-line no-var -- a `declare global` variable must be `var`
  var __orderEventListeners: Set<OrderEventListener> | undefined
}

/**
 * In-process pub/sub for orders (rem0018 phase 1 step 3b, plan "real time", as sdq's
 * `realtime/order-events.ts`): the orders `broadcast` hook publishes, the SSE routes subscribe.
 * Listeners live on `globalThis`, so dev reloads keep one set. One process only: staging runs one
 * container (scaling out needs Postgres LISTEN/NOTIFY, `docs/production-readiness.md`).
 */
export type OrderEvent = {
  type: 'created' | 'updated'
  tenantId: number
  menuId: number
  // the saved doc as the hook got it; the routes trim it per audience
  order: Order
}

export type OrderEventListener = (event: OrderEvent) => void

const getListeners = (): Set<OrderEventListener> => {
  if (!globalThis.__orderEventListeners) {
    globalThis.__orderEventListeners = new Set<OrderEventListener>()
  }
  return globalThis.__orderEventListeners
}

/** Adds a listener; returns the function that removes it (call it when the stream closes). */
export const subscribeOrderEvents = (listener: OrderEventListener): (() => void) => {
  const listeners = getListeners()
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Calls every listener with `event`. A listener that throws is logged (error, with the order id
 * and tenant) and skipped, never stops the others or the save.
 */
export const publishOrderEvent = (payload: Payload, event: OrderEvent): void => {
  const listeners = getListeners()
  for (const listener of listeners) {
    try {
      listener(event)
    } catch (err) {
      payload.logger.error({
        msg: 'order event: listener failed',
        orderId: event.order.id,
        tenantId: event.tenantId,
        err,
      })
    }
  }
  payload.logger.debug({
    msg: 'order event: published',
    type: event.type,
    orderId: event.order.id,
    tenantId: event.tenantId,
    listenerCount: listeners.size,
  })
}
