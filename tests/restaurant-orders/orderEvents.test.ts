// Order events (rem0018 phase 1 step 3b, src/common/utils/orderEvents.ts, afterCommit.ts and
// the orders broadcast hook): every saved order reaches subscribers with its tenant and menu,
// and only once its transaction has committed (plan "real time", improvement 1).
import { createLocalReq, type Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { Menu, MenuItem, Tenant } from '@/payload-types'
import { subscribeOrderEvents, type OrderEvent } from '@/common/utils/orderEvents'

import { getTestPayload } from '../common/payload'
import { TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'
import { loadUser, type SessionUser } from '../common/users'

const context = { disableRevalidate: true }

// the arrangement (beforeAll): a published test-a menu with ordering on and one item;
// `events` collects what a subscribeOrderEvents listener receives, cleared before each test,
// unsubscribed afterAll

describe('orderEvents', () => {
  let payload: Payload
  let tenantA: Tenant
  let superUser: SessionUser
  let item: MenuItem
  let menu: Menu
  let unsubscribe: (() => void) | undefined
  const events: OrderEvent[] = []

  beforeAll(async () => {
    payload = await getTestPayload()
    tenantA = await findTenant(payload, TEST_TENANTS.a)
    superUser = await loadUser(payload, TEST_USERS.superUser)

    item = await payload.create({
      collection: 'menu-items',
      data: {
        title: uniqueName('Item Events'),
        price: 15,
        tenant: tenantA.id,
      },
      overrideAccess: true,
      context,
    })

    menu = await payload.create({
      collection: 'menus',
      data: {
        title: uniqueName('Menu Events'),
        tenant: tenantA.id,
        _status: 'published',
        items: [item.id],
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

    unsubscribe = subscribeOrderEvents((event) => {
      events.push(event)
    })
  })

  beforeEach(() => {
    events.length = 0
  })

  afterAll(() => {
    unsubscribe?.()
  })

  it('publishes created and updated orders with their tenant', async () => {
    // arrange: a subscribed listener
    // act: create a guest order (no user), then move it to confirmed as the super user
    const order = await payload.create({
      collection: 'orders',
      data: {
        tenant: tenantA.id,
        menu: menu.id,
        status: 'pending',
        source: 'guest',
        type: 'dine_in',
        paymentStatus: 'unpaid',
        guestName: uniqueName('Guest'),
        items: [{ item: item.id, quantity: 1 }],
      },
      overrideAccess: true,
    })

    await payload.update({
      collection: 'orders',
      id: order.id,
      data: { status: 'confirmed' },
      user: superUser,
      overrideAccess: false,
    })

    // assert: two events for that order id: 'created' then 'updated' (status confirmed), both
    //         with tenantId test-a and the menu's id
    const orderEvents = events.filter((e) => e.order.id === order.id)
    expect(orderEvents).toHaveLength(2)
    expect(orderEvents[0]).toMatchObject({
      type: 'created',
      tenantId: tenantA.id,
      menuId: menu.id,
      order: { id: order.id, status: 'pending' },
    })
    expect(orderEvents[1]).toMatchObject({
      type: 'updated',
      tenantId: tenantA.id,
      menuId: menu.id,
      order: { id: order.id, status: 'confirmed' },
    })
  })

  it('publishes only after the save commits', async () => {
    // arrange: a subscribed listener; payload.db.beginTransaction() and a req with that
    //          transactionID (createLocalReq)
    const transactionID = await payload.db.beginTransaction()
    if (!transactionID) {
      throw new Error('tests: transaction not started')
    }
    const req = await createLocalReq({}, payload)
    req.transactionID = transactionID

    // act: create a guest order with that req; read events; commitTransaction
    const order = await payload.create({
      collection: 'orders',
      data: {
        tenant: tenantA.id,
        menu: menu.id,
        status: 'pending',
        source: 'guest',
        type: 'dine_in',
        paymentStatus: 'unpaid',
        guestName: uniqueName('Guest'),
        items: [{ item: item.id, quantity: 1 }],
      },
      overrideAccess: true,
      req,
    })

    const eventsBeforeCommit = events.filter((e) => e.order.id === order.id)
    await payload.db.commitTransaction(transactionID)
    const eventsAfterCommit = events.filter((e) => e.order.id === order.id)

    // assert: no event for it before the commit, one 'created' event after
    expect(eventsBeforeCommit).toHaveLength(0)
    expect(eventsAfterCommit).toHaveLength(1)
    expect(eventsAfterCommit[0]).toMatchObject({
      type: 'created',
      tenantId: tenantA.id,
      menuId: menu.id,
      order: { id: order.id },
    })
  })

  it('publishes nothing when the save rolls back', async () => {
    // arrange: as above, a transaction and a req with it
    const transactionID = await payload.db.beginTransaction()
    if (!transactionID) {
      throw new Error('tests: transaction not started')
    }
    const req = await createLocalReq({}, payload)
    req.transactionID = transactionID

    // act: create a guest order with that req, then rollbackTransaction
    const guestName = uniqueName('Guest')
    const order = await payload.create({
      collection: 'orders',
      data: {
        tenant: tenantA.id,
        menu: menu.id,
        status: 'pending',
        source: 'guest',
        type: 'dine_in',
        paymentStatus: 'unpaid',
        guestName,
        items: [{ item: item.id, quantity: 1 }],
      },
      overrideAccess: true,
      req,
    })

    await payload.db.rollbackTransaction(transactionID)

    // assert: no event for it (and no order with that guest name)
    const orderEvents = events.filter((e) => e.order.id === order.id)
    expect(orderEvents).toHaveLength(0)

    const { docs } = await payload.find({
      collection: 'orders',
      where: {
        guestName: { equals: guestName },
      },
      overrideAccess: true,
    })
    expect(docs).toHaveLength(0)
  })
})
