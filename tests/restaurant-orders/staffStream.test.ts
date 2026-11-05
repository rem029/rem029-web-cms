// The staff boards' live stream (rem0018 phase 4 step 1,
// src/app/(frontend)/next/orders/stream/route.ts): GET with a session and a tenant, server-sent
// events of that tenant's orders on the user's menus.
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { GET } from '@/app/(frontend)/next/orders/stream/route'
import type { Menu, MenuItem, Tenant } from '@/payload-types'

import { getTestPayload } from '../common/payload'
import { TEST_TENANTS, TEST_USERS } from '../common/seed'
import { openFrames } from '../common/sse'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'
import { loadUser, type SessionUser } from '../common/users'

// the arrangement (beforeAll):
// - test-a: one item; menu WKC (published, ordering on, staff [waiter, kitchen, cashier]); menu
//   W2 (published, ordering on, staff []); test-b: a published menu with ordering on, staff
//   [otherWaiter]
// - a helper `tokenFor(email)`: `payload.login` (password = email, the test seed) → the JWT
// - a helper `openStream(token | null, tenantId)`: GET
//   `http://localhost/next/orders/stream?tenant=<id>` with `Authorization: JWT <token>` and an
//   AbortController's signal; the test aborts it afterwards
// - frames read with `openFrames` (tests/common/sse.ts)
// - orders created with overrideAccess (context { disableRevalidate: true })

const context = { disableRevalidate: true }

describe('staff stream', () => {
  let payload: Payload
  let tenantA: Tenant
  let tenantB: Tenant
  let tenantAdmin: SessionUser
  let member: SessionUser
  let waiter: SessionUser
  let kitchen: SessionUser
  let cashier: SessionUser
  let otherWaiter: SessionUser
  let itemA: MenuItem
  let itemB: MenuItem
  let menuWKC: Menu
  let menuW2: Menu
  let menuB: Menu

  const tokenFor = async (userOrEmail: SessionUser | string): Promise<string> => {
    const email = typeof userOrEmail === 'string' ? userOrEmail : userOrEmail.email
    const result = await payload.login({
      collection: 'users',
      data: { email, password: email },
    })
    if (!result.token) {
      throw new Error(`login failed for ${email}`)
    }
    return result.token
  }

  const openStream = (
    token: string | null,
    tenantId: number,
    controller?: AbortController,
  ): Promise<Response> => {
    const headers = new Headers()
    if (token) {
      headers.set('Authorization', `JWT ${token}`)
    }
    return GET(
      new Request(`http://localhost/next/orders/stream?tenant=${tenantId}`, {
        headers,
        signal: controller?.signal,
      }),
    )
  }

  beforeAll(async () => {
    payload = await getTestPayload()
    tenantA = await findTenant(payload, TEST_TENANTS.a)
    tenantB = await findTenant(payload, TEST_TENANTS.b)
    tenantAdmin = await loadUser(payload, TEST_USERS.tenantAdmin)
    member = await loadUser(payload, TEST_USERS.member)
    waiter = await loadUser(payload, TEST_USERS.waiter)
    kitchen = await loadUser(payload, TEST_USERS.kitchen)
    cashier = await loadUser(payload, TEST_USERS.cashier)
    otherWaiter = await loadUser(payload, TEST_USERS.otherWaiter)

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

    itemB = await payload.create({
      collection: 'menu-items',
      data: {
        title: uniqueName('Item B'),
        price: 10,
        tenant: tenantB.id,
      },
      overrideAccess: true,
      context,
    })

    menuWKC = await payload.create({
      collection: 'menus',
      data: {
        title: uniqueName('Menu WKC'),
        tenant: tenantA.id,
        _status: 'published',
        items: [itemA.id],
        ordering: {
          enabled: true,
          flow: 'waiter_kitchen_cashier',
          showPrices: true,
          staff: [waiter.id, kitchen.id, cashier.id],
        },
      },
      draft: false,
      overrideAccess: true,
      context,
    })

    menuW2 = await payload.create({
      collection: 'menus',
      data: {
        title: uniqueName('Menu W2'),
        tenant: tenantA.id,
        _status: 'published',
        items: [itemA.id],
        ordering: {
          enabled: true,
          flow: 'waiter_kitchen_cashier',
          showPrices: true,
          staff: [],
        },
      },
      draft: false,
      overrideAccess: true,
      context,
    })

    menuB = await payload.create({
      collection: 'menus',
      data: {
        title: uniqueName('Menu B'),
        tenant: tenantB.id,
        _status: 'published',
        items: [itemB.id],
        ordering: {
          enabled: true,
          flow: 'waiter_kitchen_cashier',
          showPrices: true,
          staff: [otherWaiter.id],
        },
      },
      draft: false,
      overrideAccess: true,
      context,
    })
  })

  it('refuses anonymous requests', async () => {
    // act: openStream(null, test-a)
    // assert: status 401
    const controller = new AbortController()
    try {
      const response = await openStream(null, tenantA.id, controller)
      expect(response.status).toBe(401)
    } finally {
      controller.abort()
    }
  })

  it('refuses a user without a staff role', async () => {
    // act: openStream(tokenFor(member), test-a)
    // assert: status 403
    const controller = new AbortController()
    try {
      const token = await tokenFor(member)
      const response = await openStream(token, tenantA.id, controller)
      expect(response.status).toBe(403)
    } finally {
      controller.abort()
    }
  })

  it("streams only the user's tenant", async () => {
    // arrange: openStream(tokenFor(waiter), test-a); wait for `connected`
    // act: create an order in test-b, then one on WKC
    // assert: the next `order` frame is the WKC order (the test-b one never arrives first)
    const controller = new AbortController()
    try {
      const token = await tokenFor(waiter)
      const response = await openStream(token, tenantA.id, controller)
      const frames = openFrames(response)
      const connected = await frames.next('connected')
      expect(connected.event).toBe('connected')

      await payload.create({
        collection: 'orders',
        data: {
          tenant: tenantB.id,
          menu: menuB.id,
          status: 'pending',
          source: 'guest',
          type: 'dine_in',
          paymentStatus: 'unpaid',
          guestName: uniqueName('Guest B'),
          items: [{ item: itemB.id, quantity: 1 }],
        },
        overrideAccess: true,
        context,
      })

      const orderA = await payload.create({
        collection: 'orders',
        data: {
          tenant: tenantA.id,
          menu: menuWKC.id,
          status: 'pending',
          source: 'guest',
          type: 'dine_in',
          paymentStatus: 'unpaid',
          guestName: uniqueName('Guest A'),
          items: [{ item: itemA.id, quantity: 1 }],
        },
        overrideAccess: true,
        context,
      })

      const frame = await frames.next('order')
      expect(frame.event).toBe('order')
      expect(frame.data).toMatchObject({
        order: expect.objectContaining({ id: orderA.id }),
      })
    } finally {
      controller.abort()
    }
  })

  it("streams only orders of the user's menus", async () => {
    // arrange: openStream(tokenFor(waiter), test-a); wait for `connected`
    // act: create an order on W2, then one on WKC
    // assert: the next `order` frame is the WKC order
    const controller = new AbortController()
    try {
      const token = await tokenFor(waiter)
      const response = await openStream(token, tenantA.id, controller)
      const frames = openFrames(response)
      const connected = await frames.next('connected')
      expect(connected.event).toBe('connected')

      await payload.create({
        collection: 'orders',
        data: {
          tenant: tenantA.id,
          menu: menuW2.id,
          status: 'pending',
          source: 'guest',
          type: 'dine_in',
          paymentStatus: 'unpaid',
          guestName: uniqueName('Guest W2'),
          items: [{ item: itemA.id, quantity: 1 }],
        },
        overrideAccess: true,
        context,
      })

      const orderWKC = await payload.create({
        collection: 'orders',
        data: {
          tenant: tenantA.id,
          menu: menuWKC.id,
          status: 'pending',
          source: 'guest',
          type: 'dine_in',
          paymentStatus: 'unpaid',
          guestName: uniqueName('Guest WKC'),
          items: [{ item: itemA.id, quantity: 1 }],
        },
        overrideAccess: true,
        context,
      })

      const frame = await frames.next('order')
      expect(frame.event).toBe('order')
      expect(frame.data).toMatchObject({
        order: expect.objectContaining({ id: orderWKC.id }),
      })
    } finally {
      controller.abort()
    }
  })

  it('streams every menu to a tenant admin', async () => {
    // arrange: openStream(tokenFor(tenantAdmin), test-a); wait for `connected`
    // act: create an order on W2
    // assert: an `order` frame with that order arrives
    const controller = new AbortController()
    try {
      const token = await tokenFor(tenantAdmin)
      const response = await openStream(token, tenantA.id, controller)
      const frames = openFrames(response)
      const connected = await frames.next('connected')
      expect(connected.event).toBe('connected')

      const orderW2 = await payload.create({
        collection: 'orders',
        data: {
          tenant: tenantA.id,
          menu: menuW2.id,
          status: 'pending',
          source: 'guest',
          type: 'dine_in',
          paymentStatus: 'unpaid',
          guestName: uniqueName('Guest Admin W2'),
          items: [{ item: itemA.id, quantity: 1 }],
        },
        overrideAccess: true,
        context,
      })

      const frame = await frames.next('order')
      expect(frame.event).toBe('order')
      expect(frame.data).toMatchObject({
        order: expect.objectContaining({ id: orderW2.id }),
      })
    } finally {
      controller.abort()
    }
  })

  it('never sends the guest token hash', async () => {
    // arrange: openStream(tokenFor(waiter), test-a); wait for `connected`
    // act: create an order on WKC with a guestTokenHash (overrideAccess, as placeOrder stores it)
    // assert: the `order` frame's order has no guestTokenHash key
    const controller = new AbortController()
    try {
      const token = await tokenFor(waiter)
      const response = await openStream(token, tenantA.id, controller)
      const frames = openFrames(response)
      await frames.next('connected')

      await payload.create({
        collection: 'orders',
        data: {
          tenant: tenantA.id,
          menu: menuWKC.id,
          status: 'pending',
          source: 'guest',
          type: 'dine_in',
          paymentStatus: 'unpaid',
          guestName: uniqueName('Guest hash'),
          guestTokenHash: 'a'.repeat(64),
          items: [{ item: itemA.id, quantity: 1 }],
        },
        overrideAccess: true,
        context,
      })

      const frame = await frames.next('order')
      expect(frame.data).not.toHaveProperty('order.guestTokenHash')
    } finally {
      controller.abort()
    }
  })
})
