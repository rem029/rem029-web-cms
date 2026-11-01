// What a guest does with an order they placed (rem0018 phase 3 step 1,
// src/app/(frontend)/menu/_data/guestOrders.ts: cancelOrder, requestAssistance, payOnline), with
// the order id and the token placeOrder gave them. No user, as the server actions call it.
import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import {
  cancelOrder,
  payOnline,
  placeOrder,
  requestAssistance,
} from '@/app/(frontend)/menu/_data/guestOrders'
import { TEST_CHECKOUT_PATH } from '@/common/utils/payments/providers/test'
import type { Menu, MenuItem, Table, Tenant } from '@/payload-types'

import { getTestPayload } from '../common/payload'
import { TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'
import { loadUser, type SessionUser } from '../common/users'

// the arrangement (beforeAll):
// - vi.stubEnv PAYMENTS_TEST_PROVIDER 'true', PAYMENTS_TEST_SECRET 'test-secret' (unstubbed afterAll)
// - test-a: one item, a published menu with ordering on and a table; Settings
//   `onlinePayments.provider` 'test'
// - test-b: the same, Settings without a provider
// - a helper `placed(tenant)`: placeOrder → { orderId, guestToken } (a unique ip each time)

const context = { disableRevalidate: true }

describe('guest order actions', () => {
  let payload: Payload
  let tenantA: Tenant
  let tenantB: Tenant
  let superUser: SessionUser

  let itemA: MenuItem
  let itemB: MenuItem
  let menuA: Menu
  let menuB: Menu
  let tableA: Table
  let tableB: Table

  const placed = async (tenant: Tenant): Promise<{ orderId: number; guestToken: string }> => {
    const isA = tenant.id === tenantA.id
    const menu = isA ? menuA : menuB
    const table = isA ? tableA : tableB
    const item = isA ? itemA : itemB
    const result = await placeOrder(
      payload,
      { tenantId: tenant.id, ip: uniqueName('ip') },
      {
        menuSlug: menu.slug ?? '',
        tableSlug: table.slug ?? '',
        guestName: uniqueName('Guest'),
        lines: [{ itemId: item.id, quantity: 1, optionIds: [] }],
      },
    )
    if (!result.ok) {
      throw new Error(`placed failed: ${result.error}`)
    }
    return { orderId: result.orderId, guestToken: result.guestToken }
  }

  beforeAll(async () => {
    vi.stubEnv('PAYMENTS_TEST_PROVIDER', 'true')
    vi.stubEnv('PAYMENTS_TEST_SECRET', 'test-secret')

    payload = await getTestPayload()
    tenantA = await findTenant(payload, TEST_TENANTS.a)
    tenantB = await findTenant(payload, TEST_TENANTS.b)
    superUser = await loadUser(payload, TEST_USERS.superUser)

    const { docs: settingsA } = await payload.find({
      collection: 'settings',
      where: { tenant: { equals: tenantA.id } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    if (!settingsA[0]) throw new Error('tests: no settings for tenantA')
    await payload.update({
      collection: 'settings',
      id: settingsA[0].id,
      data: {
        onlinePayments: { provider: 'test' },
      },
      overrideAccess: true,
      context,
    })

    const { docs: settingsB } = await payload.find({
      collection: 'settings',
      where: { tenant: { equals: tenantB.id } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    if (!settingsB[0]) throw new Error('tests: no settings for tenantB')
    await payload.update({
      collection: 'settings',
      id: settingsB[0].id,
      data: {
        onlinePayments: { provider: 'none' },
      },
      overrideAccess: true,
      context,
    })

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
        },
      },
      draft: false,
      overrideAccess: true,
      context,
    })

    tableA = await payload.create({
      collection: 'tables',
      data: {
        label: 'ta',
        slug: 'ta',
        tenant: tenantA.id,
        menu: menuA.id,
        isActive: true,
      },
      locale: 'en',
      overrideAccess: true,
      context,
    })

    tableB = await payload.create({
      collection: 'tables',
      data: {
        label: 'tb',
        slug: 'tb',
        tenant: tenantB.id,
        menu: menuB.id,
        isActive: true,
      },
      locale: 'en',
      overrideAccess: true,
      context,
    })
  })

  afterAll(() => {
    vi.unstubAllEnvs()
  })

  it('cancels a pending order with its token', async () => {
    // arrange: a placed order
    const order = await placed(tenantA)

    // act: cancelOrder(context, { orderId, token })
    const result = await cancelOrder(
      payload,
      { tenantId: tenantA.id, ip: uniqueName('ip') },
      { orderId: order.orderId, token: order.guestToken },
    )

    // assert: ok, order.status cancelled (read back with overrideAccess too)
    expect(result).toMatchObject({
      ok: true,
      order: { status: 'cancelled' },
    })
    const reloaded = await payload.findByID({
      collection: 'orders',
      id: order.orderId,
      overrideAccess: true,
      depth: 0,
    })
    expect(reloaded.status).toBe('cancelled')
  })

  it('refuses without the token', async () => {
    // arrange: a placed order
    const order = await placed(tenantA)
    const otherOrder = await placed(tenantA)

    // act: cancelOrder with token '' and with another order's token
    const resEmpty = await cancelOrder(
      payload,
      { tenantId: tenantA.id, ip: uniqueName('ip') },
      { orderId: order.orderId, token: '' },
    )
    const resOther = await cancelOrder(
      payload,
      { tenantId: tenantA.id, ip: uniqueName('ip') },
      { orderId: order.orderId, token: otherOrder.guestToken },
    )

    // assert: both { ok: false, status: 404, error: 'orderNotFound' }; still pending
    expect(resEmpty).toMatchObject({ ok: false, status: 404, error: 'orderNotFound' })
    expect(resOther).toMatchObject({ ok: false, status: 404, error: 'orderNotFound' })
    const reloaded = await payload.findByID({
      collection: 'orders',
      id: order.orderId,
      overrideAccess: true,
      depth: 0,
    })
    expect(reloaded.status).toBe('pending')
  })

  it('refuses cancelling once confirmed', async () => {
    // arrange: a placed order, confirmed by the super user
    const order = await placed(tenantA)
    await payload.update({
      collection: 'orders',
      id: order.orderId,
      data: { status: 'confirmed' },
      user: superUser,
      overrideAccess: false,
    })

    // act: cancelOrder with its token
    const result = await cancelOrder(
      payload,
      { tenantId: tenantA.id, ip: uniqueName('ip') },
      { orderId: order.orderId, token: order.guestToken },
    )

    // assert: { ok: false, status: 403, error: 'cannotCancel' }; still confirmed
    expect(result).toMatchObject({ ok: false, status: 403, error: 'cannotCancel' })
    const reloaded = await payload.findByID({
      collection: 'orders',
      id: order.orderId,
      overrideAccess: true,
      depth: 0,
    })
    expect(reloaded.status).toBe('confirmed')
  })

  it('flags the bill request on the order', async () => {
    // arrange: a placed order
    const order = await placed(tenantA)

    // act: requestAssistance({ orderId, token, kind: 'bill' })
    const result = await requestAssistance(
      payload,
      { tenantId: tenantA.id, ip: uniqueName('ip') },
      { orderId: order.orderId, token: order.guestToken, kind: 'bill' },
    )

    // assert: ok, order.billRequestedAt set; assistanceRequestedAt still null
    expect(result).toMatchObject({
      ok: true,
      order: {
        billRequestedAt: expect.any(String),
        assistanceRequestedAt: null,
      },
    })
    const reloaded = await payload.findByID({
      collection: 'orders',
      id: order.orderId,
      overrideAccess: true,
      depth: 0,
    })
    expect(reloaded.billRequestedAt).toBeTruthy()
    expect(reloaded.assistanceRequestedAt).toBeNull()
  })

  it('limits repeated staff calls', async () => {
    // arrange: a placed order, one requestAssistance kind 'staff'
    const order = await placed(tenantA)
    const first = await requestAssistance(
      payload,
      { tenantId: tenantA.id, ip: uniqueName('ip') },
      { orderId: order.orderId, token: order.guestToken, kind: 'staff' },
    )
    expect(first).toMatchObject({ ok: true })

    // act: a second one right away
    const second = await requestAssistance(
      payload,
      { tenantId: tenantA.id, ip: uniqueName('ip') },
      { orderId: order.orderId, token: order.guestToken, kind: 'staff' },
    )

    // assert: { ok: false, status: 429, error: 'tooSoon' }
    expect(second).toMatchObject({ ok: false, status: 429, error: 'tooSoon' })
  })

  it('starts an online payment only when the tenant has a provider', async () => {
    // arrange: a placed order in test-a and one in test-b
    const orderA = await placed(tenantA)
    const orderB = await placed(tenantB)

    // act: payOnline for each, with their tokens
    const resultA = await payOnline(
      payload,
      { tenantId: tenantA.id, ip: uniqueName('ip') },
      { orderId: orderA.orderId, token: orderA.guestToken },
    )
    const resultB = await payOnline(
      payload,
      { tenantId: tenantB.id, ip: uniqueName('ip') },
      { orderId: orderB.orderId, token: orderB.guestToken },
    )

    // assert: test-a ok, redirectUrl starts with TEST_CHECKOUT_PATH and carries
    //   return=/menu/<slug>?order=<id>; test-b { ok: false, status: 400,
    //   error: 'onlinePaymentUnavailable' }
    expect(resultA).toMatchObject({
      ok: true,
      redirectUrl: expect.stringContaining(TEST_CHECKOUT_PATH),
    })
    const redirectUrlA = resultA.ok ? resultA.redirectUrl : ''
    expect(decodeURIComponent(redirectUrlA)).toContain(
      `return=/menu/${menuA.slug}?order=${orderA.orderId}`,
    )
    expect(resultB).toMatchObject({
      ok: false,
      status: 400,
      error: 'onlinePaymentUnavailable',
    })
  })

  it('refuses paying online without the token', async () => {
    // arrange: a placed order in test-a
    const order = await placed(tenantA)

    // act: payOnline with a wrong token
    const result = await payOnline(
      payload,
      { tenantId: tenantA.id, ip: uniqueName('ip') },
      { orderId: order.orderId, token: 'wrong-token' },
    )

    // assert: { ok: false, status: 404, error: 'orderNotFound' }; no payment for the order
    expect(result).toMatchObject({ ok: false, status: 404, error: 'orderNotFound' })
    const { totalDocs } = await payload.count({
      collection: 'payments',
      where: { order: { equals: order.orderId } },
      overrideAccess: true,
    })
    expect(totalDocs).toBe(0)
  })
})
