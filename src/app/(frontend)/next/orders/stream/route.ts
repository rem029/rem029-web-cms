import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { subscribeOrderEvents } from '@/common/utils/orderEvents'
import { sseResponse } from '@/common/utils/sse'
import { staffMenuIds, staffReqFor, staffRolesFor } from '@/common/utils/staffRoles'
import type { User } from '@/payload-types'

export const dynamic = 'force-dynamic'

const isRecord = (val: unknown): val is Record<string, unknown> =>
  typeof val === 'object' && val !== null

const isUser = (val: unknown): val is User => {
  if (!isRecord(val)) return false
  if (typeof val.id !== 'number' || typeof val.email !== 'string') return false
  if ('collection' in val && val.collection !== 'users') return false
  return true
}

/**
 * The staff boards' live stream (rem0018 phase 4 step 1, plan "real time", sdq
 * `app/api/orders/stream/route.ts`): `GET /next/orders/stream?tenant=<id>`, server-sent events
 * through `sseResponse` (`src/common/utils/sse.ts`).
 * 1. `payload.auth({ headers: request.headers })`; no user → 401 json `{ error: 'unauthorized' }`
 * 2. tenant = the `tenant` param (integer, else 400); `staffRolesFor(user, tenant)` empty → 403
 *    `{ error: 'forbidden' }`, `warn` with user id and tenant id
 * 3. menus = `staffMenuIds` (with `staffReqFor(payload, user)`),
 *    null = every menu of the tenant
 * 4. `sseResponse({ onOpen })`: `subscribeOrderEvents` → for an event of this tenant whose
 *    `menuId` is in menus (or menus null) send `order` with `{ type, order }` (the saved doc
 *    without `guestTokenHash`, which the api never returns). The menu list is fixed for the stream's life: a staff list change
 *    applies on the board's next reconnect.
 */
export async function GET(request: Request): Promise<Response> {
  const payload = await getPayload({ config: configPromise })

  const { user } = await payload.auth({ headers: request.headers })
  if (!isUser(user)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const tenantParam = url.searchParams.get('tenant')
  const tenantId = Number(tenantParam)
  if (!tenantParam || Number.isNaN(tenantId) || !Number.isInteger(tenantId) || tenantId <= 0) {
    return Response.json({ error: 'badRequest' }, { status: 400 })
  }

  const roles = staffRolesFor(user, tenantId)
  if (roles.length === 0) {
    payload.logger.warn({
      msg: 'orders/stream: forbidden (no staff role)',
      userId: user.id,
      tenantId,
    })
    return Response.json({ error: 'forbidden' }, { status: 403 })
  }

  const staffReq = await staffReqFor(payload, user)
  const menus = await staffMenuIds(staffReq, tenantId)

  payload.logger.debug({
    msg: 'orders/stream: open',
    userId: user.id,
    tenantId,
    menuCount: menus === null ? null : menus.length,
  })

  return sseResponse({
    request,
    payload,
    logContext: { route: 'orders/stream', userId: user.id, tenantId },
    onOpen: (send) =>
      subscribeOrderEvents((event) => {
        if (event.tenantId === tenantId && (menus === null || menus.includes(event.menuId))) {
          // the hook's doc skips field access: drop the guest token hash (read: false on the api)
          const { guestTokenHash: _hash, ...order } = event.order
          send('order', { type: event.type, order })
        }
      }),
  })
}
