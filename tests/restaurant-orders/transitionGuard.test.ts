// Order status moves (rem0018 phase 1 step 3b, src/collections/Orders/utils/transitions.ts and
// hooks/transitionGuard.ts, autoComplete.ts, statusTimestamps.ts): who may move an order where,
// per flow. Staff act through the Local API (overrideAccess: false) on menus that list them;
// guests are calls without a user, as the guest server actions (phase 3).
import type { Payload } from 'payload'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import type { Menu, MenuItem, Order, Setting, Tenant } from '@/payload-types'

import { rejectionText } from '../common/errors'
import { getTestPayload } from '../common/payload'
import { TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'
import { loadUser, type SessionUser } from '../common/users'

// the arrangement for the role table (beforeAll):
// - test-a: one published menu per flow (waiter_kitchen_cashier, waiter_kitchen, kitchen_only),
//   ordering on, one item, staff [waiter, kitchen, cashier]
// - a helper `orderAt(flow, status)`: creates a guest order on that flow's menu, then walks it
//   forward to `status` as the super user (a cancelled one with a reason)
// - a helper `moveAs(who, order, to, cancelReason?)`: who = waiter | kitchen | cashier |
//   tenantAdmin | otherWaiter (overrideAccess: false, user) | guest (overrideAccess: true, no user)

type Who = 'waiter' | 'kitchen' | 'cashier' | 'tenantAdmin' | 'guest' | 'otherWaiter'
type Flow = 'waiter_kitchen_cashier' | 'waiter_kitchen' | 'kitchen_only'
type Status =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'prepared'
  | 'served'
  | 'completed'
  | 'cancelled'
// 'moves' = saved with `to` (or autoComplete's status); a number = rejects with that status
type Outcome = 'moves' | 400 | 403

type MoveCase = {
  name: string
  flow: Flow
  from: Status
  to: Status
  who: Who
  reason?: string
  outcome: Outcome
}

const context = { disableRevalidate: true }

const CASES: MoveCase[] = [
  { name: 'waiter confirms', flow: 'waiter_kitchen_cashier', from: 'pending', to: 'confirmed', who: 'waiter', outcome: 'moves' },
  { name: 'kitchen prepares', flow: 'waiter_kitchen_cashier', from: 'confirmed', to: 'preparing', who: 'kitchen', outcome: 'moves' },
  { name: 'cashier completes', flow: 'waiter_kitchen_cashier', from: 'served', to: 'completed', who: 'cashier', outcome: 'moves' },
  { name: 'waiter cannot prepare', flow: 'waiter_kitchen_cashier', from: 'confirmed', to: 'preparing', who: 'waiter', outcome: 403 },
  { name: 'kitchen only lets the kitchen confirm', flow: 'kitchen_only', from: 'pending', to: 'confirmed', who: 'kitchen', outcome: 'moves' },
  { name: 'kitchen only shuts the waiter out', flow: 'kitchen_only', from: 'pending', to: 'confirmed', who: 'waiter', outcome: 403 },
  { name: 'waiter cannot cancel once preparing', flow: 'waiter_kitchen_cashier', from: 'preparing', to: 'cancelled', who: 'waiter', reason: 'Guest left', outcome: 403 },
  { name: 'cashier cannot cancel once preparing', flow: 'waiter_kitchen_cashier', from: 'preparing', to: 'cancelled', who: 'cashier', reason: 'Guest left', outcome: 403 },
  { name: 'kitchen cancels while preparing', flow: 'waiter_kitchen_cashier', from: 'preparing', to: 'cancelled', who: 'kitchen', reason: 'Out of stock', outcome: 'moves' },
  { name: 'tenant admin cancels while preparing', flow: 'waiter_kitchen_cashier', from: 'preparing', to: 'cancelled', who: 'tenantAdmin', reason: 'Guest left', outcome: 'moves' },
  { name: 'staff cancel needs a reason', flow: 'waiter_kitchen_cashier', from: 'pending', to: 'cancelled', who: 'waiter', outcome: 400 },
  { name: 'guest cancels a pending order', flow: 'waiter_kitchen_cashier', from: 'pending', to: 'cancelled', who: 'guest', outcome: 'moves' },
  { name: 'guest may only cancel pending', flow: 'waiter_kitchen_cashier', from: 'confirmed', to: 'cancelled', who: 'guest', outcome: 403 },
  { name: 'waiter moves served back to prepared', flow: 'waiter_kitchen_cashier', from: 'served', to: 'prepared', who: 'waiter', outcome: 'moves' },
  { name: 'moves a completed order back without a cashier step', flow: 'waiter_kitchen', from: 'completed', to: 'prepared', who: 'waiter', outcome: 'moves' },
  { name: 'kitchen moves prepared back to preparing', flow: 'waiter_kitchen_cashier', from: 'prepared', to: 'preparing', who: 'kitchen', outcome: 'moves' },
  { name: "waiter cannot move the kitchen's step back", flow: 'waiter_kitchen_cashier', from: 'prepared', to: 'preparing', who: 'waiter', outcome: 403 },
  { name: 'refuses skipping a step', flow: 'waiter_kitchen_cashier', from: 'pending', to: 'served', who: 'tenantAdmin', outcome: 400 },
  // ordersAccess hides another business's order before the guard sees it
  { name: 'staff of another tenant cannot move it', flow: 'waiter_kitchen_cashier', from: 'pending', to: 'confirmed', who: 'otherWaiter', outcome: 403 },
]

describe('transitionGuard', () => {
  let payload: Payload
  let tenantA: Tenant
  let superUser: SessionUser
  let tenantAdmin: SessionUser
  let waiter: SessionUser
  let kitchen: SessionUser
  let cashier: SessionUser
  let otherWaiter: SessionUser
  let itemA: MenuItem
  let menus: Record<Flow, Menu>

  const orderAt = async (flow: Flow, status: Status): Promise<Order> => {
    const menu = menus[flow]
    let current = await payload.create({
      collection: 'orders',
      data: {
        tenant: tenantA.id,
        menu: menu.id,
        status: 'pending',
        source: 'guest',
        type: 'dine_in',
        paymentStatus: 'unpaid',
        guestName: uniqueName('Guest'),
        items: [{ item: itemA.id, quantity: 1 }],
      },
      overrideAccess: true,
    })

    if (status === 'pending') {
      return current
    }

    if (status === 'cancelled') {
      return payload.update({
        collection: 'orders',
        id: current.id,
        data: {
          status: 'cancelled',
          cancelReason: 'Test',
        },
        user: superUser,
        overrideAccess: false,
      })
    }

    const steps: Status[] = ['confirmed', 'preparing', 'prepared', 'served', 'completed']
    for (const next of steps) {
      if (current.status === status) {
        break
      }
      current = await payload.update({
        collection: 'orders',
        id: current.id,
        data: { status: next },
        user: superUser,
        overrideAccess: false,
      })
    }
    return current
  }

  const moveAs = (
    who: Who,
    order: Order,
    to: Status,
    cancelReason?: string,
  ): Promise<Order> => {
    const data = {
      status: to,
      ...(cancelReason !== undefined ? { cancelReason } : {}),
    }

    if (who === 'guest') {
      return payload.update({
        collection: 'orders',
        id: order.id,
        data,
        overrideAccess: true,
      })
    }

    const staffUsers: Record<Exclude<Who, 'guest'>, SessionUser> = {
      waiter,
      kitchen,
      cashier,
      tenantAdmin,
      otherWaiter,
    }

    return payload.update({
      collection: 'orders',
      id: order.id,
      data,
      user: staffUsers[who],
      overrideAccess: false,
    })
  }

  beforeAll(async () => {
    payload = await getTestPayload()
    tenantA = await findTenant(payload, TEST_TENANTS.a)
    superUser = await loadUser(payload, TEST_USERS.superUser)
    tenantAdmin = await loadUser(payload, TEST_USERS.tenantAdmin)
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

    const menuWKC = await payload.create({
      collection: 'menus',
      data: {
        title: uniqueName('Guard Alpha'),
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

    const menuWK = await payload.create({
      collection: 'menus',
      data: {
        title: uniqueName('Guard Bravo'),
        tenant: tenantA.id,
        _status: 'published',
        items: [itemA.id],
        ordering: {
          enabled: true,
          flow: 'waiter_kitchen',
          showPrices: true,
          staff: [waiter.id, kitchen.id, cashier.id],
        },
      },
      draft: false,
      overrideAccess: true,
      context,
    })

    const menuKO = await payload.create({
      collection: 'menus',
      data: {
        title: uniqueName('Guard Charlie'),
        tenant: tenantA.id,
        _status: 'published',
        items: [itemA.id],
        ordering: {
          enabled: true,
          flow: 'kitchen_only',
          showPrices: true,
          staff: [waiter.id, kitchen.id, cashier.id],
        },
      },
      draft: false,
      overrideAccess: true,
      context,
    })

    menus = {
      waiter_kitchen_cashier: menuWKC,
      waiter_kitchen: menuWK,
      kitchen_only: menuKO,
    }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // one table, two loops (no `if` in a test): the allowed moves, then the refusals
  it.each(CASES.filter((c) => c.outcome === 'moves'))(
    '$name',
    async ({ flow, from, to, who, reason }) => {
      // arrange: order = orderAt(flow, from)
      const order = await orderAt(flow, from)

      // act: moveAs(who, order, to, reason)
      const saved = await moveAs(who, order, to, reason)

      // assert: the saved status is `to`
      expect(saved.status).toBe(to)
    },
  )

  it.each(CASES.filter((c) => c.outcome !== 'moves'))(
    '$name',
    async ({ flow, from, to, who, reason, outcome }) => {
      // arrange: order = orderAt(flow, from)
      const order = await orderAt(flow, from)

      // act: moveAs(who, order, to, reason)
      const call = moveAs(who, order, to, reason)

      // assert: rejects with { status: outcome }
      await expect(call).rejects.toMatchObject({ status: outcome })
    },
  )

  it('checks staff passed as a plain user doc', async () => {
    // arrange: orderAt('waiter_kitchen_cashier', 'pending'); the waiter as `payload.find` returns
    //          the doc (no `collection`, as seeds and scripts pass users)
    const order = await orderAt('waiter_kitchen_cashier', 'pending')
    const { docs } = await payload.find({
      collection: 'users',
      where: { email: { equals: TEST_USERS.waiter } },
      depth: 2,
      limit: 1,
    })
    const plainWaiter = docs[0]
    expect(plainWaiter).toBeDefined()

    // act: move it to confirmed as that doc
    const saved = await payload.update({
      collection: 'orders',
      id: order.id,
      data: { status: 'confirmed' },
      user: plainWaiter,
      overrideAccess: false,
    })

    // assert: confirmed (a waiter's move, not refused as a guest's)
    expect(saved.status).toBe('confirmed')
  })

  it('refuses moving back a completed order from an earlier day', async () => {
    // arrange: fake clock 2031-03-04 12:00 UTC; orderAt('waiter_kitchen', 'completed');
    //          clock to 2031-03-05 12:00 UTC (the next business day, test-a in UTC; other days
    //          than orders.test.ts, whose numbering expects its days empty)
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2031-03-04T12:00:00Z'))
    const order = await orderAt('waiter_kitchen', 'completed')
    vi.setSystemTime(new Date('2031-03-05T12:00:00Z'))

    // act: moveAs('waiter', order, 'prepared')
    const call = moveAs('waiter', order, 'prepared')

    // assert: rejects with { status: 400 }
    await expect(call).rejects.toMatchObject({ status: 400 })
  })

  it('auto-completes served orders without a cashier step', async () => {
    // arrange: orderAt('waiter_kitchen', 'prepared')
    const order = await orderAt('waiter_kitchen', 'prepared')

    // act: moveAs('waiter', order, 'served')
    const saved = await moveAs('waiter', order, 'served')

    // assert: status 'completed', servedAt and completedAt both set
    expect(saved.status).toBe('completed')
    expect(saved.servedAt).toBeTruthy()
    expect(saved.completedAt).toBeTruthy()
  })

  it('stamps each status time once', async () => {
    // arrange: orderAt('waiter_kitchen_cashier', 'confirmed'), its confirmedAt
    const order = await orderAt('waiter_kitchen_cashier', 'confirmed')
    const initialConfirmedAt = order.confirmedAt
    expect(initialConfirmedAt).toBeTruthy()

    // act: update its notes as the waiter (status unchanged)
    const updated = await payload.update({
      collection: 'orders',
      id: order.id,
      data: { notes: 'Updated notes' },
      user: waiter,
      overrideAccess: false,
    })

    // assert: confirmedAt unchanged; preparingAt … cancelledAt empty
    expect(updated.confirmedAt).toBe(initialConfirmedAt)
    expect(updated.preparingAt).toBeFalsy()
    expect(updated.preparedAt).toBeFalsy()
    expect(updated.servedAt).toBeFalsy()
    expect(updated.completedAt).toBeFalsy()
    expect(updated.cancelledAt).toBeFalsy()
  })

  it('clears the stamp of a step moved back', async () => {
    // arrange: orderAt('waiter_kitchen_cashier', 'served')
    const order = await orderAt('waiter_kitchen_cashier', 'served')
    expect(order.servedAt).toBeTruthy()
    expect(order.preparedAt).toBeTruthy()

    // act: moveAs('waiter', order, 'prepared')
    const moved = await moveAs('waiter', order, 'prepared')

    // assert: servedAt empty, preparedAt still set
    expect(moved.servedAt).toBeFalsy()
    expect(moved.preparedAt).toBeTruthy()
  })

  it('refuses guest orders while closed when set', async () => {
    // arrange: a business of its own (other files count test-c's menus): Settings with ordersOnlyWhenOpen on,
    //          timezone UTC, every weekday closed except mon 08:00–22:00; a published menu with
    //          ordering on and one item; fake clock Sunday 2030-01-13 12:00 UTC
    const openingHours: NonNullable<NonNullable<Setting['restaurant']>['openingHours']> = [
      { weekday: 'mon', opens: '08:00', closes: '22:00', closed: false },
      { weekday: 'tue', closed: true },
      { weekday: 'wed', closed: true },
      { weekday: 'thu', closed: true },
      { weekday: 'fri', closed: true },
      { weekday: 'sat', closed: true },
      { weekday: 'sun', closed: true },
    ]

    const closedSlug = uniqueName('closed')
    const tenantC = await payload.create({
      collection: 'tenants',
      data: { name: closedSlug, slug: closedSlug },
      overrideAccess: true,
      context,
    })

    // every business gets its Settings doc when it is created (createTenantDocs)
    await payload.update({
      collection: 'settings',
      where: { tenant: { equals: tenantC.id } },
      data: {
        restaurant: {
          ordersOnlyWhenOpen: true,
          timezone: 'UTC',
          openingHours,
        },
      },
      overrideAccess: true,
    })

    const itemC = await payload.create({
      collection: 'menu-items',
      data: {
        title: uniqueName('Item C'),
        price: 10,
        tenant: tenantC.id,
      },
      overrideAccess: true,
      context,
    })

    const menuC = await payload.create({
      collection: 'menus',
      data: {
        title: uniqueName('Menu C'),
        tenant: tenantC.id,
        _status: 'published',
        items: [itemC.id],
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

    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2030-01-13T12:00:00Z'))

    // act: create a guest order on that menu (no user)
    const call = payload.create({
      collection: 'orders',
      data: {
        tenant: tenantC.id,
        menu: menuC.id,
        status: 'pending',
        source: 'guest',
        type: 'dine_in',
        paymentStatus: 'unpaid',
        guestName: uniqueName('Guest'),
        items: [{ item: itemC.id, quantity: 1 }],
      },
      overrideAccess: true,
    })

    // assert: rejects with { status: 403 } and "We're closed now" in the message
    await expect(call).rejects.toMatchObject({ status: 403 })
    const text = await rejectionText(call)
    expect(text).toMatch(/We're closed now/)
  })
})
