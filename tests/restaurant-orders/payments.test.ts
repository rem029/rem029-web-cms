// Payments (rem0018 phase 2 step 1, src/collections/Payments and its hooks validatePayment.ts,
// syncOrderPayment.ts): cashiers record one cash or card payment for an order's full total, on
// the orders of the menus that list them; the order is paid while that payment stands. Staff act
// through the Local API (overrideAccess: false).
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import type { Menu, MenuItem, Order, Payment, Tenant } from '@/payload-types'

import { rejectionText } from '../common/errors'
import { getTestPayload } from '../common/payload'
import { TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'
import { loadUser, type SessionUser } from '../common/users'

// the arrangement (beforeAll):
// - test-a: one item at 10.00, one published menu `waiter_kitchen_cashier`, ordering on, staff
//   [waiter, kitchen, cashier]; a second published menu without the cashier on its staff list
// - test-b: one item, one published menu with otherWaiter on it
// - a helper `servedOrder(menu?)`: a guest order (1 × the item, total 1000), walked to served as
//   the super user
// - a helper `pay(user, order, data)`: payload.create payments (overrideAccess: false, user)

const context = { disableRevalidate: true }

type PayData = {
  method: 'cash' | 'card' | 'online'
  amount?: number | null
  received?: number | null
  reference?: string | null
  remarks?: string | null
}

describe('payments', () => {
  let payload: Payload
  let tenantA: Tenant
  let tenantB: Tenant
  let superUser: SessionUser
  let tenantAdmin: SessionUser
  let waiter: SessionUser
  let kitchen: SessionUser
  let cashier: SessionUser
  let otherWaiter: SessionUser
  let itemA: MenuItem
  let itemB: MenuItem
  let menuWKC: Menu
  let menuWithoutCashier: Menu
  let menuB: Menu

  const preparedOrder = async (
    menu: Menu = menuWKC,
    item: MenuItem = itemA,
    tenant: Tenant = tenantA,
  ): Promise<Order> => {
    const order = await payload.create({
      collection: 'orders',
      data: {
        tenant: tenant.id,
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
    await payload.update({
      collection: 'orders',
      id: order.id,
      data: { status: 'preparing' },
      user: superUser,
      overrideAccess: false,
    })
    return payload.update({
      collection: 'orders',
      id: order.id,
      data: { status: 'prepared' },
      user: superUser,
      overrideAccess: false,
    })
  }

  const servedOrder = async (
    menu: Menu = menuWKC,
    item: MenuItem = itemA,
    tenant: Tenant = tenantA,
  ): Promise<Order> => {
    const prepared = await preparedOrder(menu, item, tenant)
    return payload.update({
      collection: 'orders',
      id: prepared.id,
      data: { status: 'served' },
      user: superUser,
      overrideAccess: false,
    })
  }

  const pay = (user: SessionUser, order: Order, data: PayData): Promise<Payment> =>
    payload.create({
      collection: 'payments',
      data: {
        order: order.id,
        tenant: (typeof order.tenant === 'object' ? order.tenant?.id : order.tenant) ?? undefined,
        status: 'succeeded',
        ...data,
      },
      user,
      overrideAccess: false,
      depth: 0,
    })

  beforeAll(async () => {
    payload = await getTestPayload()
    tenantA = await findTenant(payload, TEST_TENANTS.a)
    tenantB = await findTenant(payload, TEST_TENANTS.b)
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

    menuWithoutCashier = await payload.create({
      collection: 'menus',
      data: {
        title: uniqueName('Menu Without Cashier'),
        tenant: tenantA.id,
        _status: 'published',
        items: [itemA.id],
        ordering: {
          enabled: true,
          flow: 'waiter_kitchen_cashier',
          showPrices: true,
          staff: [waiter.id, kitchen.id],
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

  it('records a cash payment with change', async () => {
    // arrange: servedOrder()
    const order = await servedOrder()

    // act: pay(cashier, order, { method: 'cash', received: 2000 })
    const payment = await pay(cashier, order, { method: 'cash', received: 2000 })

    // assert: status succeeded, amount 1000 (the total), change 1000, takenBy cashier, provider
    //         'manual', currency and orderNumber copied from the order
    expect(payment.status).toBe('succeeded')
    expect(payment.amount).toBe(1000)
    expect(payment.change).toBe(1000)
    expect(payment.takenBy).toBe(cashier.id)
    expect(payment.provider).toBe('manual')
    expect(payment.currency).toBe(order.currency)
    expect(payment.orderNumber).toBe(order.orderNumber)
  })

  it('takes the order total as the amount', async () => {
    // arrange: servedOrder()
    const order = await servedOrder()

    // act: pay(cashier, order, { method: 'card', amount: 1, reference: 'R-0' })
    const payment = await pay(cashier, order, { method: 'card', amount: 1, reference: 'R-0' })

    // assert: amount 1000
    expect(payment.amount).toBe(1000)
  })

  it('requires a receipt number for card', async () => {
    // arrange: servedOrder()
    const order = await servedOrder()

    // act: pay(cashier, order, { method: 'card' }) (no reference)
    const call = pay(cashier, order, { method: 'card' })

    // assert: rejects, rejectionText contains 'receipt number'
    const text = await rejectionText(call)
    expect(text).toContain('receipt number')
  })

  it('refuses cash below the total', async () => {
    // arrange: servedOrder()
    const order = await servedOrder()

    // act: pay(cashier, order, { method: 'cash', received: 500 })
    const call = pay(cashier, order, { method: 'cash', received: 500 })

    // assert: rejects, rejectionText contains 'less than the total'
    const text = await rejectionText(call)
    expect(text).toContain('less than the total')
  })

  it('marks the order paid', async () => {
    // arrange: an order on the menu walked to `prepared` (not served: no completing)
    const order = await preparedOrder()

    // act: pay(cashier, order, { method: 'card', reference: 'R-1', remarks: 'Visa' })
    await pay(cashier, order, { method: 'card', reference: 'R-1', remarks: 'Visa' })

    // assert: the order reads paymentStatus 'paid', status still 'prepared'
    const updatedOrder = await payload.findByID({
      collection: 'orders',
      id: order.id,
      overrideAccess: true,
    })
    expect(updatedOrder.paymentStatus).toBe('paid')
    expect(updatedOrder.status).toBe('prepared')
  })

  it('completes a served order once paid', async () => {
    // arrange: servedOrder()
    const order = await servedOrder()

    // act: pay(cashier, order, { method: 'card', reference: 'R-2' })
    await pay(cashier, order, { method: 'card', reference: 'R-2' })

    // assert: the order reads paymentStatus 'paid', status 'completed', completedAt set
    const updatedOrder = await payload.findByID({
      collection: 'orders',
      id: order.id,
      overrideAccess: true,
    })
    expect(updatedOrder.paymentStatus).toBe('paid')
    expect(updatedOrder.status).toBe('completed')
    expect(updatedOrder.completedAt).toBeTruthy()
  })

  it('refuses a second payment', async () => {
    // arrange: an order walked to `prepared`, paid by card
    const order = await preparedOrder()
    await pay(cashier, order, { method: 'card', reference: 'R-first' })

    // act: pay(cashier, order, { method: 'cash' })
    const call = pay(cashier, order, { method: 'cash' })

    // assert: rejects, rejectionText contains 'already paid'
    const text = await rejectionText(call)
    expect(text).toContain('already paid')
  })

  it('refuses a second payment at once', async () => {
    // arrange: servedOrder()
    const order = await servedOrder()

    // act: Promise.allSettled of two pay(cashier, order, { method: 'cash' })
    const results = await Promise.allSettled([
      pay(cashier, order, { method: 'cash' }),
      pay(cashier, order, { method: 'cash' }),
    ])

    // assert: one fulfilled, one rejected; one succeeded payment for the order
    const fulfilled = results.filter((r) => r.status === 'fulfilled')
    const rejected = results.filter((r) => r.status === 'rejected')
    expect(fulfilled).toHaveLength(1)
    expect(rejected).toHaveLength(1)

    const payments = await payload.find({
      collection: 'payments',
      where: {
        and: [{ order: { equals: order.id } }, { status: { equals: 'succeeded' } }],
      },
      overrideAccess: true,
    })
    expect(payments.totalDocs).toBe(1)
  })

  it('voids a payment with a reason and marks the order unpaid', async () => {
    // arrange: an order walked to `prepared`, payment = pay by card
    const order = await preparedOrder()
    const payment = await pay(cashier, order, { method: 'card', reference: 'R-void' })

    // act: update the payment as the cashier: { status: 'voided', voidReason: 'Wrong card' }
    const updatedPayment = await payload.update({
      collection: 'payments',
      id: payment.id,
      data: { status: 'voided', voidReason: 'Wrong card' },
      user: cashier,
      overrideAccess: false,
    })

    // assert: payment voided; the order reads paymentStatus 'unpaid'; a new pay() succeeds
    expect(updatedPayment.status).toBe('voided')
    const reloadedOrder = await payload.findByID({
      collection: 'orders',
      id: order.id,
      overrideAccess: true,
    })
    expect(reloadedOrder.paymentStatus).toBe('unpaid')
    const newPayment = await pay(cashier, order, { method: 'card', reference: 'R-new' })
    expect(newPayment.status).toBe('succeeded')
  })

  it('records a new payment after voiding on a completed order', async () => {
    // walkthrough 2026-11-01: the order picker offers unpaid orders, completed ones too
    // arrange: servedOrder(); payment = pay cash (completes it), voided with a reason
    const order = await servedOrder()
    const payment = await pay(cashier, order, { method: 'cash' })
    await payload.update({
      collection: 'payments',
      id: payment.id,
      data: { status: 'voided', voidReason: 'Wrong amount' },
      user: cashier,
      overrideAccess: false,
    })

    // act: pay(cashier, order, { method: 'card', reference: 'R-again' })
    const again = await pay(cashier, order, { method: 'card', reference: 'R-again' })

    // assert: payment succeeded; the order reads completed and paid
    expect(again.status).toBe('succeeded')
    const reloaded = await payload.findByID({
      collection: 'orders',
      id: order.id,
      overrideAccess: true,
    })
    expect(reloaded.status).toBe('completed')
    expect(reloaded.paymentStatus).toBe('paid')
  })

  it('refuses voiding without a reason', async () => {
    // arrange: an order walked to `prepared`, payment = pay by card
    const order = await preparedOrder()
    const payment = await pay(cashier, order, { method: 'card', reference: 'R-void-no-reason' })

    // act: update the payment as the cashier: { status: 'voided' }
    const call = payload.update({
      collection: 'payments',
      id: payment.id,
      data: { status: 'voided' },
      user: cashier,
      overrideAccess: false,
    })

    // assert: rejects, rejectionText contains 'reason'
    const text = await rejectionText(call)
    expect(text).toContain('reason')
  })

  it('refuses editing a succeeded payment', async () => {
    // arrange: an order walked to `prepared`, payment = pay by card, reference 'R-3'
    const order = await preparedOrder()
    const payment = await pay(cashier, order, { method: 'card', reference: 'R-3' })

    // act: update the payment as the cashier: { reference: 'R-4' }
    const call = payload.update({
      collection: 'payments',
      id: payment.id,
      data: { reference: 'R-4' },
      user: cashier,
      overrideAccess: false,
    })

    // assert: rejects, rejectionText contains 'Void it'; the payment still reads 'R-3'
    const text = await rejectionText(call)
    expect(text).toContain('Void it')
    const reloadedPayment = await payload.findByID({
      collection: 'payments',
      id: payment.id,
      overrideAccess: true,
    })
    expect(reloadedPayment.reference).toBe('R-3')
  })

  it('lists a completed order with a voided payment as unpaid', async () => {
    // arrange: servedOrder(); payment = pay cash (completes it)
    const order = await servedOrder()
    const payment = await pay(cashier, order, { method: 'cash' })

    // act: void the payment as the cashier with a reason
    await payload.update({
      collection: 'payments',
      id: payment.id,
      data: { status: 'voided', voidReason: 'Customer refund' },
      user: cashier,
      overrideAccess: false,
    })

    // assert: the order reads status 'completed', paymentStatus 'unpaid'
    const reloadedOrder = await payload.findByID({
      collection: 'orders',
      id: order.id,
      overrideAccess: true,
    })
    expect(reloadedOrder.status).toBe('completed')
    expect(reloadedOrder.paymentStatus).toBe('unpaid')
  })

  it.each(['waiter', 'kitchen'] as const)('refuses %s staff', async (role) => {
    // arrange: servedOrder()
    const order = await servedOrder()
    const staffByRole = { waiter, kitchen }
    const who = staffByRole[role]

    // act: pay(<who>, order, { method: 'cash' })
    const call = pay(who, order, { method: 'cash' })

    // assert: rejects with { status: 403 }
    await expect(call).rejects.toMatchObject({ status: 403 })
  })

  it('refuses cashiers the menu does not list', async () => {
    // arrange: servedOrder(the menu without the cashier)
    const order = await servedOrder(menuWithoutCashier)

    // act: pay(cashier, order, { method: 'cash' })
    const call = pay(cashier, order, { method: 'cash' })

    // assert: rejects with { status: 403 }
    await expect(call).rejects.toMatchObject({ status: 403 })
  })

  it('refuses an order of another tenant', async () => {
    // arrange: a test-b order walked to served
    const order = await servedOrder(menuB, itemB, tenantB)

    // act: pay(cashier of test-a, that order, { method: 'cash' })
    const call = pay(cashier, order, { method: 'cash' })

    // assert: rejects (403, or 400 from validateSameTenant); no payment row for that order
    await expect(call).rejects.toMatchObject({ status: 403 })
    const payments = await payload.find({
      collection: 'payments',
      where: { order: { equals: order.id } },
      overrideAccess: true,
    })
    expect(payments.totalDocs).toBe(0)
  })

  it('refuses a cancelled order', async () => {
    // arrange: an order cancelled as the super user with a reason
    const pending = await payload.create({
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
    const order = await payload.update({
      collection: 'orders',
      id: pending.id,
      data: { status: 'cancelled', cancelReason: uniqueName('Reason') },
      user: superUser,
      overrideAccess: false,
    })

    // act: pay(cashier, order, { method: 'cash' })
    const call = pay(cashier, order, { method: 'cash' })

    // assert: rejects, rejectionText contains 'cancelled'
    const text = await rejectionText(call)
    expect(text).toContain('cancelled')
  })

  it('refuses online payments from staff', async () => {
    // arrange: servedOrder()
    const order = await servedOrder()

    // act: pay(cashier, order, { method: 'online' })
    const call = pay(cashier, order, { method: 'online' })

    // assert: rejects, rejectionText contains 'payment provider'
    const text = await rejectionText(call)
    expect(text).toContain('payment provider')
  })

  it('refuses staff writing the payment status', async () => {
    // field access on the order's money and payment fields
    // arrange: servedOrder()
    const order = await servedOrder()

    // act: update the order as the waiter: { paymentStatus: 'paid', total: 1 }
    await payload.update({
      collection: 'orders',
      id: order.id,
      data: { paymentStatus: 'paid', total: 1 },
      user: waiter,
      overrideAccess: false,
    })

    // assert: the order reads paymentStatus 'unpaid', total 1000 (stripped, not refused)
    const reloaded = await payload.findByID({
      collection: 'orders',
      id: order.id,
      overrideAccess: true,
    })
    expect(reloaded.paymentStatus).toBe('unpaid')
    expect(reloaded.total).toBe(1000)
  })

  it('shows a cashier only the payments of their menus', async () => {
    // menuStaffAccess on payments
    // arrange: servedOrder() paid by the cashier; an order on the menu without the cashier paid
    //          by the tenant admin
    const order1 = await servedOrder()
    const payment1 = await pay(cashier, order1, { method: 'cash' })

    const order2 = await servedOrder(menuWithoutCashier)
    const payment2 = await pay(tenantAdmin, order2, { method: 'cash' })

    // act: payload.find payments as the cashier (overrideAccess: false)
    const result = await payload.find({
      collection: 'payments',
      user: cashier,
      overrideAccess: false,
    })

    // assert: the first payment is listed, the second isn't
    const ids = result.docs.map((p) => p.id)
    expect(ids).toContain(payment1.id)
    expect(ids).not.toContain(payment2.id)
  })
})
