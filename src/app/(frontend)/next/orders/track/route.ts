import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { findFrontendTenantId } from '@/common/utils/frontendTenant'
import { findGuestOrder, toGuestOrder } from '@/common/utils/guestOrder'
import { subscribeOrderEvents } from '@/common/utils/orderEvents'
import { requestHost } from '@/common/utils/resolveTenantHost'
import { sseResponse } from '@/common/utils/sse'

export const dynamic = 'force-dynamic'

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

  return sseResponse({
    request,
    payload,
    logContext: { route: 'orders/track', tenantId, orderId: order.id },
    onOpen: (send) =>
      subscribeOrderEvents(async (event) => {
        if (event.tenantId === tenantId && event.order.id === order.id) {
          try {
            const guestSnapshot = await toGuestOrder(payload, event.order)
            send('order', guestSnapshot)
          } catch (err) {
            payload.logger.error({
              msg: 'orders/track: snapshot failed',
              tenantId,
              orderId: order.id,
              err,
            })
          }
        }
      }),
  })
}
