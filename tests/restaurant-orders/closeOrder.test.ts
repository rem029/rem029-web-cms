// Closing an order (rem0018 phase 2 step 1, src/collections/Orders/utils/closeOrder.ts and
// checkClose in utils/transitions.ts): cashiers and tenant admins finish any open order, paid or
// without payment with a reason.
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { closeOrder } from '@/collections/Orders/utils/closeOrder'
import type { Menu, MenuItem, Order, Tenant } from '@/payload-types'

import { rejectionText } from '../common/errors'
import { getTestPayload } from '../common/payload'
import { TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'
import { loadUser, type SessionUser } from '../common/users'

// the arrangement (beforeAll):
// - test-a: one item at 10.00, one published menu `waiter_kitchen_cashier`, ordering on, staff
//   [waiter, kitchen, cashier]
// - a helper `orderAt(status)`: a guest order walked to `status` as the super user

const context = { disableRevalidate: true }

describe('closeOrder', () => {
  let payload: Payload
  let tenantA: Tenant
  let superUser: SessionUser
  let tenantAdmin: SessionUser
  let waiter: SessionUser
  let kitchen: SessionUser
  let cashier: SessionUser
  let itemA: MenuItem
  let menuWKC: Menu

  const orderAt = async (
    status: 'pending' | 'confirmed' | 'preparing' | 'prepared' | 'served',
  ): Promise<Order> => {
    const order = await payload.create({
      collection: 'orders',
      data: {
        tenant: tenantA.id,
        menu: menuWKC.id,
        status: 'pending',
        source: 'guest',
        type: 'dine_in',
        paymentStatus: 'unpaid',
        guestName: uniqueName('Guest'),
        items: [{ item: itemA.id, quantity: 1 }],
      },
      overrideAccess: true,
    })

    const walks: Record<typeof status, () => Promise<Order>> = {
      pending: async () => order,
      confirmed: async () =>
        payload.update({
          collection: 'orders',
          id: order.id,
          data: { status: 'confirmed' },
          user: superUser,
          overrideAccess: false,
        }),
      preparing: async () => {
        const confirmed = await walks.confirmed()
        return payload.update({
          collection: 'orders',
          id: confirmed.id,
          data: { status: 'preparing' },
          user: superUser,
          overrideAccess: false,
        })
      },
      prepared: async () => {
        const preparing = await walks.preparing()
        return payload.update({
          collection: 'orders',
          id: preparing.id,
          data: { status: 'prepared' },
          user: superUser,
          overrideAccess: false,
        })
      },
      served: async () => {
        const prepared = await walks.prepared()
        return payload.update({
          collection: 'orders',
          id: prepared.id,
          data: { status: 'served' },
          user: superUser,
          overrideAccess: false,
        })
      },
    }

    return walks[status]()
  }

  beforeAll(async () => {
    payload = await getTestPayload()
    tenantA = await findTenant(payload, TEST_TENANTS.a)
    superUser = await loadUser(payload, TEST_USERS.superUser)
    tenantAdmin = await loadUser(payload, TEST_USERS.tenantAdmin)
    waiter = await loadUser(payload, TEST_USERS.waiter)
    kitchen = await loadUser(payload, TEST_USERS.kitchen)
    cashier = await loadUser(payload, TEST_USERS.cashier)

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

    menuWKC = await payload.create({
      collection: 'menus',
      data: {
        title: uniqueName('Menu cashier flow'),
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
  })

  it('closes an unpaid order with a reason', async () => {
    // arrange: orderAt('served')
    const order = await orderAt('served')

    // act: closeOrder(payload, cashier, { orderId, outcome: 'unpaid', reason: 'walked_out' })
    const closed = await closeOrder(payload, cashier, {
      orderId: order.id,
      outcome: 'unpaid',
      reason: 'walked_out',
    })

    // assert: status 'completed', paymentStatus 'waived', closeReason 'walked_out', completedAt set
    expect(closed.status).toBe('completed')
    expect(closed.paymentStatus).toBe('waived')
    expect(closed.closeReason).toBe('walked_out')
    expect(closed.completedAt).toBeTruthy()
  })

  it('refuses closing unpaid without a reason', async () => {
    // arrange: orderAt('served')
    const order = await orderAt('served')

    // act: closeOrder(payload, cashier, { orderId, outcome: 'unpaid' })
    const call = closeOrder(payload, cashier, { orderId: order.id, outcome: 'unpaid' })

    // assert: rejects, rejectionText contains 'why'; the order still reads served
    const text = await rejectionText(call)
    expect(text).toContain('why')
    const reloaded = await payload.findByID({
      collection: 'orders',
      id: order.id,
      overrideAccess: true,
    })
    expect(reloaded.status).toBe('served')
  })

  it('needs a note for other', async () => {
    // arrange: orderAt('served')
    const order = await orderAt('served')

    // act: closeOrder(payload, cashier, { orderId, outcome: 'unpaid', reason: 'other' })
    const call = closeOrder(payload, cashier, {
      orderId: order.id,
      outcome: 'unpaid',
      reason: 'other',
    })

    // assert: rejects, rejectionText contains 'note'
    const text = await rejectionText(call)
    expect(text).toContain('note')
  })

  it('refuses closing as paid when unpaid', async () => {
    // arrange: orderAt('served')
    const order = await orderAt('served')

    // act: closeOrder(payload, cashier, { orderId, outcome: 'paid' })
    const call = closeOrder(payload, cashier, { orderId: order.id, outcome: 'paid' })

    // assert: rejects, rejectionText contains 'paid yet'
    const text = await rejectionText(call)
    expect(text).toContain('paid yet')
  })

  it('closes a paid order as paid', async () => {
    // arrange: orderAt('confirmed'); a card payment by the cashier (paid, not served)
    const order = await orderAt('confirmed')
    await payload.create({
      collection: 'payments',
      data: {
        order: order.id,
        tenant: tenantA.id,
        method: 'card',
        status: 'succeeded',
        reference: uniqueName('R'),
      },
      user: cashier,
      overrideAccess: false,
    })

    // act: closeOrder(payload, cashier, { orderId, outcome: 'paid' })
    const closed = await closeOrder(payload, cashier, { orderId: order.id, outcome: 'paid' })

    // assert: status 'completed', paymentStatus 'paid', no closeReason
    expect(closed.status).toBe('completed')
    expect(closed.paymentStatus).toBe('paid')
    expect(closed.closeReason).toBeFalsy()
  })

  it('refuses closing a paid order unpaid', async () => {
    // a payment that went through stays on its order (user 2026-11-01)
    // arrange: orderAt('confirmed'); a card payment by the cashier
    const order = await orderAt('confirmed')
    await payload.create({
      collection: 'payments',
      data: {
        order: order.id,
        tenant: tenantA.id,
        method: 'card',
        status: 'succeeded',
        reference: uniqueName('R'),
      },
      user: cashier,
      overrideAccess: false,
    })

    // act: closeOrder(payload, cashier, { orderId, outcome: 'unpaid', reason: 'walked_out' })
    const call = closeOrder(payload, cashier, {
      orderId: order.id,
      outcome: 'unpaid',
      reason: 'walked_out',
    })

    // assert: rejects, rejectionText contains 'is paid'; the order still reads paid, confirmed
    const text = await rejectionText(call)
    expect(text).toContain('is paid')
    const reloaded = await payload.findByID({
      collection: 'orders',
      id: order.id,
      overrideAccess: true,
    })
    expect(reloaded.paymentStatus).toBe('paid')
    expect(reloaded.status).toBe('confirmed')
  })

  it('refuses waiters', async () => {
    // arrange: orderAt('served')
    const order = await orderAt('served')

    // act: closeOrder(payload, waiter, { orderId, outcome: 'unpaid', reason: 'walked_out' })
    const call = closeOrder(payload, waiter, {
      orderId: order.id,
      outcome: 'unpaid',
      reason: 'walked_out',
    })

    // assert: rejects with { status: 403 }
    await expect(call).rejects.toMatchObject({ status: 403 })
  })

  it.each(['pending', 'confirmed', 'preparing', 'prepared', 'served'] as const)(
    'lets tenant admins close a %s order',
    async (status) => {
      // arrange: orderAt(<status>)
      const order = await orderAt(status)

      // act: closeOrder(payload, tenantAdmin, { orderId, outcome: 'unpaid', reason: 'complimentary' })
      const closed = await closeOrder(payload, tenantAdmin, {
        orderId: order.id,
        outcome: 'unpaid',
        reason: 'complimentary',
      })

      // assert: status 'completed', paymentStatus 'waived'
      expect(closed.status).toBe('completed')
      expect(closed.paymentStatus).toBe('waived')
    },
  )

  it('refuses closing a closed order', async () => {
    // arrange: orderAt('served'), closed unpaid by the cashier
    const order = await orderAt('served')
    await closeOrder(payload, cashier, {
      orderId: order.id,
      outcome: 'unpaid',
      reason: 'walked_out',
    })

    // act: closeOrder again as the cashier, reason 'walked_out'
    const call = closeOrder(payload, cashier, {
      orderId: order.id,
      outcome: 'unpaid',
      reason: 'walked_out',
    })

    // assert: rejects, rejectionText contains 'already closed'
    const text = await rejectionText(call)
    expect(text).toContain('already closed')
  })
})
