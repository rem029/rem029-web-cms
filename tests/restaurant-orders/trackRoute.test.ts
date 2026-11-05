// The guest's live order stream (rem0018 phase 3 step 1,
// src/app/(frontend)/next/orders/track/route.ts): GET with the order id and token, server-sent
// events of the guest snapshot only.
import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { placeOrder } from '@/app/(frontend)/menu/_data/guestOrders'
import { GET } from '@/app/(frontend)/next/orders/track/route'
import type { Menu, MenuItem, Tenant } from '@/payload-types'

import { getTestPayload } from '../common/payload'
import { openFrames } from '../common/sse'
import { TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'
import { loadUser, type SessionUser } from '../common/users'

// the arrangement (beforeAll):
// - vi.stubEnv TENANT_BASE_DOMAIN 'cms.example.test' (unstubbed afterAll); requests to
//   `http://test-a.cms.example.test/next/orders/track?order=<id>&token=<token>`
// - test-a: one item, a published menu with ordering on and a table; an order placed with
//   placeOrder → { orderId, guestToken }
// - a helper `openFrames(response)`: reads the body's SSE frames with one reader, keeping the
//   buffer, returning `{ next(until, timeoutMs) }`; the test aborts the request afterwards (an
//   AbortController)

const context = { disableRevalidate: true }

const EXPECTED_GUEST_ORDER_KEYS = [
  'assistanceRequestedAt',
  'billRequestedAt',
  'createdAt',
  'currency',
  'guestName',
  'id',
  'lines',
  'notes',
  'orderNumber',
  'paymentStatus',
  'receipt',
  'showPrices',
  'status',
  'table',
  'total',
].sort()

describe('track route', () => {
  let payload: Payload
  let tenantA: Tenant
  let superUser: SessionUser

  let itemA: MenuItem
  let menuA: Menu
  let order: { orderId: number; guestToken: string }

  beforeAll(async () => {
    vi.stubEnv('TENANT_BASE_DOMAIN', 'cms.example.test')

    payload = await getTestPayload()
    tenantA = await findTenant(payload, TEST_TENANTS.a)
    await findTenant(payload, TEST_TENANTS.b)
    superUser = await loadUser(payload, TEST_USERS.superUser)

    itemA = await payload.create({
      collection: 'menu-items',
      data: {
        title: uniqueName('Item A'),
        price: 10,
        tenant: tenantA.id,
      },
      overrideAccess: true,
      context,
    })

    menuA = await payload.create({
      collection: 'menus',
      data: {
        title: uniqueName('Menu A'),
        tenant: tenantA.id,
        _status: 'published',
        items: [itemA.id],
        ordering: {
          enabled: true,
          flow: 'waiter_kitchen_cashier',
          showPrices: true,
        },
      },
      draft: false,
      overrideAccess: true,
      context,
    })

    await payload.create({
      collection: 'tables',
      data: {
        label: 't1',
        slug: 't1',
        tenant: tenantA.id,
        menu: menuA.id,
        isActive: true,
      },
      locale: 'en',
      overrideAccess: true,
      context,
    })

    const placed = await placeOrder(
      payload,
      { tenantId: tenantA.id, ip: uniqueName('ip') },
      {
        menuSlug: menuA.slug ?? '',
        tableSlug: 't1',
        guestName: uniqueName('Guest'),
        lines: [{ itemId: itemA.id, quantity: 1, optionIds: [] }],
      },
    )
    if (!placed.ok) {
      throw new Error(`tests: placeOrder failed: ${placed.error}`)
    }
    order = { orderId: placed.orderId, guestToken: placed.guestToken }
  })

  afterAll(() => {
    vi.unstubAllEnvs()
  })

  it('streams the guest snapshot only', async () => {
    // arrange: open the stream with the order's token; read the `connected` frame
    const controller = new AbortController()
    try {
      const response = await GET(
        new Request(
          `http://test-a.cms.example.test/next/orders/track?order=${order.orderId}&token=${order.guestToken}`,
          {
            headers: { host: 'test-a.cms.example.test' },
            signal: controller.signal,
          },
        ),
      )
      const frames = openFrames(response)
      const connected = await frames.next('connected')
      expect(connected.event).toBe('connected')

      // act: the super user confirms the order
      await payload.update({
        collection: 'orders',
        id: order.orderId,
        data: { status: 'confirmed' },
        user: superUser,
        overrideAccess: false,
      })

      // assert: an `order` frame with status confirmed, and exactly the GuestOrder keys (no
      //   guestTokenHash, tenant, menu staff, payments)
      const orderFrame = await frames.next('order')
      expect(orderFrame.event).toBe('order')
      expect(orderFrame.data).toMatchObject({ status: 'confirmed' })
      const dataKeys =
        orderFrame.data && typeof orderFrame.data === 'object'
          ? Object.keys(orderFrame.data).sort()
          : []
      expect(dataKeys).toEqual(EXPECTED_GUEST_ORDER_KEYS)
    } finally {
      controller.abort()
    }
  })

  it('refuses a wrong token', async () => {
    // act: GET with the order id and another token, and from test-b's host with the right token
    const res1 = await GET(
      new Request(
        `http://test-a.cms.example.test/next/orders/track?order=${order.orderId}&token=wrong-token`,
        {
          headers: { host: 'test-a.cms.example.test' },
        },
      ),
    )
    const res2 = await GET(
      new Request(
        `http://test-b.cms.example.test/next/orders/track?order=${order.orderId}&token=${order.guestToken}`,
        {
          headers: { host: 'test-b.cms.example.test' },
        },
      ),
    )

    // assert: both 404
    expect(res1.status).toBe(404)
    expect(res2.status).toBe(404)
  })
})
