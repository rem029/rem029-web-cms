// A guest places an order from a table (rem0018 phase 3 step 1,
// src/app/(frontend)/menu/_data/guestOrders.ts: placeOrder). Called as the server action does:
// a GuestContext with the host's tenant and an ip, no user.
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import {
  PLACE_ORDER_LIMIT,
  placeOrder,
  type GuestResult,
} from '@/app/(frontend)/menu/_data/guestOrders'
import { hashGuestToken } from '@/common/utils/guestOrder'
import type { Menu, MenuItem, Table, Tenant } from '@/payload-types'

import { getTestPayload } from '../common/payload'
import { TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'
import { loadUser, type SessionUser } from '../common/users'

// the arrangement (beforeAll):
// - test-a: items soup (12.00, a required "Size" radio group: Small 0, Large +2.00) and steak;
//   an out-of-stock item and an item not on the menu (created here, unique names)
// - test-a: a published menu `waiter_kitchen_cashier`, ordering on, with soup, steak and the
//   out-of-stock item; table `t1` on it, and table `t9` on a second test-a menu
// - test-a: a published menu with ordering off
// - test-b: a published menu with ordering on (the slug exists only in test-b) and its table
// - context(ip) = { tenantId: test-a, ip }, a unique ip per test so the rate limit never carries
//   over

const context = { disableRevalidate: true }

const unwrapOrder = (
  result: GuestResult<{ orderId: number; orderNumber: number; guestToken: string }>,
): { ok: true; orderId: number; orderNumber: number; guestToken: string } => {
  expect(result.ok).toBe(true)
  if (!result.ok) {
    throw new Error(`Order placement failed: ${result.error}`)
  }
  return result
}

describe('placeOrder', () => {
  let payload: Payload
  let tenantA: Tenant
  let tenantB: Tenant
  let tenantAdmin: SessionUser

  let soup: MenuItem
  let steak: MenuItem
  let outOfStockItem: MenuItem
  let offMenuItem: MenuItem
  let itemB: MenuItem

  let menuA: Menu
  let menuA2: Menu
  let menuOrderingOff: Menu
  let menuB: Menu

  let tableT1: Table
  let largeId: string

  const fillRateLimit = async (ip: string): Promise<void> => {
    for (let i = 0; i < PLACE_ORDER_LIMIT; i++) {
      await placeOrder(
        payload,
        { tenantId: tenantA.id, ip },
        {
          menuSlug: menuA.slug ?? '',
          tableSlug: 't1',
          lines: [{ itemId: soup.id, quantity: 1, optionIds: [largeId] }],
        },
      )
    }
  }

  beforeAll(async () => {
    payload = await getTestPayload()
    tenantA = await findTenant(payload, TEST_TENANTS.a)
    tenantB = await findTenant(payload, TEST_TENANTS.b)
    tenantAdmin = await loadUser(payload, TEST_USERS.tenantAdmin)

    soup = await payload.create({
      collection: 'menu-items',
      data: {
        title: uniqueName('Soup'),
        price: 12,
        tenant: tenantA.id,
        modifierGroups: [
          {
            name: 'Size',
            inputType: 'radio',
            required: true,
            options: [
              { label: 'Small', price: 0 },
              { label: 'Large', price: 2 },
            ],
          },
        ],
      },
      overrideAccess: true,
      context,
    })

    const largeOption = soup.modifierGroups?.[0]?.options.find((o) => o.label === 'Large')
    if (!largeOption?.id) {
      throw new Error('tests: Large option id missing')
    }
    largeId = largeOption.id

    steak = await payload.create({
      collection: 'menu-items',
      data: {
        title: uniqueName('Steak'),
        price: 25,
        tenant: tenantA.id,
      },
      overrideAccess: true,
      context,
    })

    outOfStockItem = await payload.create({
      collection: 'menu-items',
      data: {
        title: uniqueName('Out of Stock'),
        price: 10,
        inStock: false,
        tenant: tenantA.id,
      },
      overrideAccess: true,
      context,
    })

    offMenuItem = await payload.create({
      collection: 'menu-items',
      data: {
        title: uniqueName('Off Menu'),
        price: 15,
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
        items: [soup.id, steak.id, outOfStockItem.id],
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

    tableT1 = await payload.create({
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

    menuA2 = await payload.create({
      collection: 'menus',
      data: {
        title: uniqueName('Menu A2'),
        tenant: tenantA.id,
        _status: 'published',
        items: [soup.id],
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
        label: 't9',
        slug: 't9',
        tenant: tenantA.id,
        menu: menuA2.id,
        isActive: true,
      },
      locale: 'en',
      overrideAccess: true,
      context,
    })

    menuOrderingOff = await payload.create({
      collection: 'menus',
      data: {
        title: uniqueName('Menu Ordering Off'),
        tenant: tenantA.id,
        _status: 'published',
        items: [soup.id],
        ordering: {
          enabled: false,
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
        label: 't-off',
        slug: 't-off',
        tenant: tenantA.id,
        menu: menuOrderingOff.id,
        isActive: true,
      },
      locale: 'en',
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

    await payload.create({
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

  it('places an order with server prices', async () => {
    // arrange: a line of 2 × soup with Large, the client also sending a made-up price field
    const clientLine = {
      itemId: soup.id,
      quantity: 2,
      optionIds: [largeId],
      price: 9999,
    }
    const guestName = uniqueName('Guest')

    // act: placeOrder(context, { menuSlug, tableSlug: 't1', guestName, lines })
    const result = await placeOrder(
      payload,
      { tenantId: tenantA.id, ip: uniqueName('ip') },
      {
        menuSlug: menuA.slug ?? '',
        tableSlug: 't1',
        guestName,
        lines: [clientLine],
      },
    )

    // assert: ok, orderNumber set; the order (overrideAccess) is pending, source guest, on t1,
    //   unitPrice 1200, the Large choice price 200, lineTotal 2800, total 2800
    expect(result).toMatchObject({
      ok: true,
      orderNumber: expect.any(Number),
    })
    const placed = unwrapOrder(result)
    const order = await payload.findByID({
      collection: 'orders',
      id: placed.orderId,
      overrideAccess: true,
      depth: 0,
    })
    expect(order.status).toBe('pending')
    expect(order.source).toBe('guest')
    expect(order.table).toBe(tableT1.id)
    expect(order.items?.[0]?.unitPrice).toBe(1200)
    expect(order.items?.[0]?.selectedOptions?.find((o) => o.option === largeId)?.price).toBe(200)
    expect(order.items?.[0]?.lineTotal).toBe(2800)
    expect(order.total).toBe(2800)
  })

  it("stores only the token's hash", async () => {
    // arrange: a placed order, its guestToken
    const placed = unwrapOrder(
      await placeOrder(
        payload,
        { tenantId: tenantA.id, ip: uniqueName('ip') },
        {
          menuSlug: menuA.slug ?? '',
          tableSlug: 't1',
          guestName: uniqueName('Guest'),
          lines: [{ itemId: soup.id, quantity: 1, optionIds: [largeId] }],
        },
      ),
    )

    // act: read the order with overrideAccess, and as the tenant admin (overrideAccess false)
    const orderWithOverride = await payload.findByID({
      collection: 'orders',
      id: placed.orderId,
      overrideAccess: true,
      depth: 0,
    })
    const orderAsAdmin = await payload.findByID({
      collection: 'orders',
      id: placed.orderId,
      user: tenantAdmin,
      overrideAccess: false,
      depth: 0,
    })

    // assert: guestTokenHash = sha256(guestToken), never the token; the tenant admin's read has
    //   no guestTokenHash
    expect(orderWithOverride.guestTokenHash).toBe(hashGuestToken(placed.guestToken))
    expect(orderWithOverride.guestTokenHash).not.toBe(placed.guestToken)
    expect(orderAsAdmin).not.toHaveProperty('guestTokenHash')
  })

  it("refuses a table the menu doesn't offer", async () => {
    // act: placeOrder with tableSlug 't9' (the other test-a menu's table)
    const guestName = uniqueName('Guest')
    const result = await placeOrder(
      payload,
      { tenantId: tenantA.id, ip: uniqueName('ip') },
      {
        menuSlug: menuA.slug ?? '',
        tableSlug: 't9',
        guestName,
        lines: [{ itemId: soup.id, quantity: 1, optionIds: [largeId] }],
      },
    )

    // assert: { ok: false, status: 400, error: 'tableNotOnMenu' }; no order for that guest name
    expect(result).toMatchObject({ ok: false, status: 400, error: 'tableNotOnMenu' })
    const { totalDocs } = await payload.count({
      collection: 'orders',
      where: { guestName: { equals: guestName } },
      overrideAccess: true,
    })
    expect(totalDocs).toBe(0)
  })

  it('refuses a menu of another tenant host', async () => {
    // act: test-a's context with the slug of the test-b-only menu and its table
    const result = await placeOrder(
      payload,
      { tenantId: tenantA.id, ip: uniqueName('ip') },
      {
        menuSlug: menuB.slug ?? '',
        tableSlug: 'tb',
        lines: [{ itemId: itemB.id, quantity: 1, optionIds: [] }],
      },
    )

    // assert: { ok: false, status: 404, error: 'menuNotFound' }
    expect(result).toMatchObject({ ok: false, status: 404, error: 'menuNotFound' })
  })

  it('refuses when ordering is off', async () => {
    // act: placeOrder on the test-a menu with ordering off
    const result = await placeOrder(
      payload,
      { tenantId: tenantA.id, ip: uniqueName('ip') },
      {
        menuSlug: menuOrderingOff.slug ?? '',
        tableSlug: 't-off',
        lines: [{ itemId: soup.id, quantity: 1, optionIds: [largeId] }],
      },
    )

    // assert: { ok: false, status: 403, error: 'orderingOff' }
    expect(result).toMatchObject({ ok: false, status: 403, error: 'orderingOff' })
  })

  it('refuses an out of stock item', async () => {
    // act: a line of the out-of-stock item
    const result = await placeOrder(
      payload,
      { tenantId: tenantA.id, ip: uniqueName('ip') },
      {
        menuSlug: menuA.slug ?? '',
        tableSlug: 't1',
        lines: [{ itemId: outOfStockItem.id, quantity: 1, optionIds: [] }],
      },
    )

    // assert: { ok: false, status: 400, error: 'itemUnavailable' }
    expect(result).toMatchObject({ ok: false, status: 400, error: 'itemUnavailable' })
  })

  it('refuses an item that is not on the menu', async () => {
    // act: a line of the item that isn't on the menu
    const result = await placeOrder(
      payload,
      { tenantId: tenantA.id, ip: uniqueName('ip') },
      {
        menuSlug: menuA.slug ?? '',
        tableSlug: 't1',
        lines: [{ itemId: offMenuItem.id, quantity: 1, optionIds: [] }],
      },
    )

    // assert: { ok: false, status: 400, error: 'itemUnavailable' }
    expect(result).toMatchObject({ ok: false, status: 400, error: 'itemUnavailable' })
  })

  it('rate limits repeated orders', async () => {
    // arrange: PLACE_ORDER_LIMIT orders from one ip on t1
    const ip = uniqueName('ip')
    await fillRateLimit(ip)

    // act: one more from that ip on t1
    const result = await placeOrder(
      payload,
      { tenantId: tenantA.id, ip },
      {
        menuSlug: menuA.slug ?? '',
        tableSlug: 't1',
        lines: [{ itemId: soup.id, quantity: 1, optionIds: [largeId] }],
      },
    )

    // assert: { ok: false, status: 429, error: 'tooManyOrders' }
    expect(result).toMatchObject({ ok: false, status: 429, error: 'tooManyOrders' })
  })
})
