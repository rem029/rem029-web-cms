import type { Payload } from 'payload'

/**
 * Server-sent events plumbing shared by the order streams (rem0018 phase 4 step 1, promoted from
 * the guest track route now that the staff stream needs it; plan "real time", as sdq):
 * `connected` frame first, `: ping` every 25 s so proxies keep the stream open, cleanup on abort
 * or cancel, the headers proxies need (`X-Accel-Buffering: no`, `no-transform`).
 */

/** Heartbeat so proxies keep the stream open (plan, real time). */
export const SSE_HEARTBEAT_MS = 25_000

/** Sends one frame `event: <event>\ndata: <json>\n\n`; a no-op once the stream closed. */
export type SseSend = (event: string, data: unknown) => void

export type SseStreamArgs = {
  request: Request
  payload: Payload
  // logged with the open / close `debug` lines (route name, tenant id, order id, user id); never
  // the url or a token
  logContext: Record<string, unknown>
  // subscribe here (`subscribeOrderEvents`); returns the unsubscribe, called once on close
  onOpen: (send: SseSend) => () => void
}

/**
 * The streaming Response.
 * 1. a ReadableStream whose `start` enqueues `event: connected\ndata: {}\n\n`, then calls
 *    `onOpen(send)` (send = JSON.stringify the data, enqueue, cleanup on an enqueue error)
 * 2. `setInterval` the `: ping\n\n` heartbeat (unref'd)
 * 3. cleanup once (flag): clear the interval, call the unsubscribe, `debug` "stream closed" with
 *    `logContext`; on `request.signal` abort (or already aborted) also close the controller
 *    (try/catch: the client may have cancelled); `cancel()` cleans up
 * 4. headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache, no-transform`,
 *    `Connection: keep-alive`, `X-Accel-Buffering: no`
 */
export const sseResponse = (args: SseStreamArgs): Response => {
  const { request, payload, logContext, onOpen } = args
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
    const routePrefix = logContext.route ? `${String(logContext.route)}: ` : ''
    payload.logger.debug({
      ...logContext,
      msg: `${routePrefix}stream closed`,
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

      const send: SseSend = (event, data) => {
        if (closed) return
        try {
          safeEnqueue(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        } catch {
          cleanup()
        }
      }

      unsubscribe = onOpen(send)

      intervalId = setInterval(() => {
        safeEnqueue(': ping\n\n')
      }, SSE_HEARTBEAT_MS)
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
