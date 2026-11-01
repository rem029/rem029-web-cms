import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { findFrontendTenantId } from '@/common/utils/frontendTenant'
import { findGuestOrder, toGuestOrder } from '@/common/utils/guestOrder'
import { subscribeOrderEvents } from '@/common/utils/orderEvents'
import { requestHost } from '@/common/utils/resolveTenantHost'

export const dynamic = 'force-dynamic'

/** Heartbeat so proxies keep the stream open (plan, real time). */
const HEARTBEAT_MS = 25_000

/**
 * One guest order, live (rem0018 phase 3 step 1): `GET /next/orders/track?order=<id>&token=<token>`,
 * server-sent events. The tenant comes from the request's host (`requestHost` +
 * `findFrontendTenantId`, so tests can pass a host), the order from `findGuestOrder` (id + tenant
 * + token hash). Frames: `connected` first, then `order` with the guest snapshot
 * (`toGuestOrder`) after each committed save of that order. The token is never logged.
 */
export async function GET(request: Request): Promise<Response> {
  const payload = await getPayload({ config: configPromise })
  const host = requestHost((name) => request.headers.get(name))
  const tenantId = await findFrontendTenantId(payload, host, process.env.TENANT_BASE_DOMAIN)

  const url = new URL(request.url)
  const orderId = Number(url.searchParams.get('order'))
  const token = url.searchParams.get('token') ?? ''

  // a bad id or token comes back null too
  const order = await findGuestOrder(payload, { tenantId, orderId, token })
  if (!order) {
    payload.logger.warn({ msg: 'orders/track: order not found', tenantId, orderId })
    return Response.json({ error: 'orderNotFound' }, { status: 404 })
  }

  const encoder = new TextEncoder()
  let closed = false
  let intervalId: ReturnType<typeof setInterval> | null = null
  let unsubscribe: (() => void) | null = null

  const cleanup = () => {
    if (closed) return
    closed = true
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
    payload.logger.debug({
      msg: 'orders/track: stream closed',
      tenantId,
      orderId: order.id,
    })
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const safeEnqueue = (chunkText: string) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(chunkText))
        } catch {
          cleanup()
        }
      }

      safeEnqueue('event: connected\ndata: {}\n\n')

      unsubscribe = subscribeOrderEvents(async (event) => {
        if (closed) return
        if (event.tenantId === tenantId && event.order.id === order.id) {
          try {
            const guestSnapshot = await toGuestOrder(payload, event.order)
            safeEnqueue(`event: order\ndata: ${JSON.stringify(guestSnapshot)}\n\n`)
          } catch (err) {
            payload.logger.error({
              msg: 'orders/track: snapshot failed',
              tenantId,
              orderId: order.id,
              err,
            })
          }
        }
      })

      intervalId = setInterval(() => {
        safeEnqueue(': ping\n\n')
      }, HEARTBEAT_MS)
      if (typeof intervalId.unref === 'function') {
        intervalId.unref()
      }

      const close = () => {
        cleanup()
        try {
          controller.close()
        } catch {
          // already closed by the client (cancel)
        }
      }
      if (request.signal.aborted) {
        close()
      } else {
        request.signal.addEventListener('abort', close)
      }
    },
    cancel() {
      cleanup()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
