// Online payments (rem0018 phase 2 step 2, src/common/utils/payments: startOnlinePayment.ts,
// applyWebhook.ts, providers/test.ts; the online rules in validatePayment.ts and
// syncOrderPayment.ts): a guest's checkout through the business's provider, and the provider's
// signed webhook marking it paid or failed. Server code (no user), as the guest's action and the
// webhook route call it.
import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import type { Menu, MenuItem, Order, Payment, Tenant } from '@/payload-types'
import { subscribeOrderEvents, type OrderEvent } from '@/common/utils/orderEvents'
import { applyWebhook } from '@/common/utils/payments/applyWebhook'
import type { WebhookResult } from '@/common/utils/payments/provider'
import { signTestWebhook, TEST_CHECKOUT_PATH } from '@/common/utils/payments/providers/test'
import { startOnlinePayment } from '@/common/utils/payments/startOnlinePayment'

import { rejectionText } from '../common/errors'
import { getTestPayload } from '../common/payload'
import { TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'
import { loadUser, type SessionUser } from '../common/users'

// the arrangement (beforeAll):
// - vi.stubEnv PAYMENTS_TEST_PROVIDER 'true', PAYMENTS_TEST_SECRET 'test-secret' (unstubbed afterAll)
// - test-a: one item at 10.00, one published menu `waiter_kitchen_cashier`, ordering on; its
//   Settings `onlinePayments.provider` 'test' (no other file reads it)
// - test-b: one item, one published menu; Settings without a provider
// - a helper `servedOrder(menu)`: a guest order (1 × the item, total 1000) walked to served as the
//   super user
// - a helper `webhook(result)`: `signTestWebhook(result)` → a POST `Request` with the
//   `x-test-signature` header, for `applyWebhook(payload, 'test', request)`
// - a helper `checkout(order)`: `startOnlinePayment(payload, { orderId, returnUrl: '/menu/x' })`,
//   then the payment it created (overrideAccess)

const context = { disableRevalidate: true }

const webhook = (result: WebhookResult, signatureOverride?: string): Request => {
  const { body, signature } = signTestWebhook(result)
  return new Request('http://localhost/next/payments/webhook/test', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-test-signature': signatureOverride ?? signature,
    },
    body,
  })
}

describe('online payments', () => {
  let payload: Payload
  let tenantA: Tenant
  let tenantB: Tenant
  let superUser: SessionUser
  let cashier: SessionUser
  let itemA: MenuItem
  let itemB: MenuItem
  let menuA: Menu
  let menuB: Menu

  const tenantOfMenu = new Map<number, number>()

  const servedOrder = async (menu: Menu = menuA): Promise<Order> => {
    const item = menu.id === menuB.id ? itemB : itemA
    const tenantId = tenantOfMenu.get(menu.id) ?? tenantA.id
    const order = await payload.create({
      collection: 'orders',
      data: {
        tenant: tenantId,
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
    await payload.update({
      collection: 'orders',
      id: order.id,
      data: { status: 'prepared' },
      user: superUser,
      overrideAccess: false,
    })
    return payload.update({
      collection: 'orders',
      id: order.id,
      data: { status: 'served' },
      user: superUser,
      overrideAccess: false,
    })
  }

  const checkout = async (order: Order): Promise<Payment> => {
    const result = await startOnlinePayment(payload, { orderId: order.id, returnUrl: '/menu/x' })
    expect(result).toMatchObject({ ok: true })
    const { docs: payments } = await payload.find({
      collection: 'payments',
      where: { order: { equals: order.id } },
      sort: '-id',
      limit: 1,
      overrideAccess: true,
      depth: 0,
    })
    const payment = payments[0]
    expect(payment).toBeDefined()
    return payment as Payment
  }

  beforeAll(async () => {
    vi.stubEnv('PAYMENTS_TEST_PROVIDER', 'true')
    vi.stubEnv('PAYMENTS_TEST_SECRET', 'test-secret')

    payload = await getTestPayload()
    tenantA = await findTenant(payload, TEST_TENANTS.a)
    tenantB = await findTenant(payload, TEST_TENANTS.b)
    superUser = await loadUser(payload, TEST_USERS.superUser)
    cashier = await loadUser(payload, TEST_USERS.cashier)

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
          staff: [cashier.id],
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

    tenantOfMenu.set(menuA.id, tenantA.id)
    tenantOfMenu.set(menuB.id, tenantB.id)
  })

  afterAll(() => {
    vi.unstubAllEnvs()
  })

  describe('startOnlinePayment', () => {
    it('starts a checkout for the order total', async () => {
      // arrange: servedOrder(menuA)
      const order = await servedOrder(menuA)

      // act: startOnlinePayment(payload, { orderId, returnUrl: '/menu/x' })
      const result = await startOnlinePayment(payload, { orderId: order.id, returnUrl: '/menu/x' })

      // assert: ok, redirectUrl starts with TEST_CHECKOUT_PATH; the payment: method online,
      //   provider 'test', status pending, amount 1000, providerRef set; the order still unpaid
      expect(result).toMatchObject({
        ok: true,
        redirectUrl: expect.stringContaining(TEST_CHECKOUT_PATH),
      })

      const { docs: payments } = await payload.find({
        collection: 'payments',
        where: { order: { equals: order.id } },
        overrideAccess: true,
        depth: 0,
      })
      const payment = payments[0]
      expect(payment).toBeDefined()
      expect(payment?.method).toBe('online')
      expect(payment?.provider).toBe('test')
      expect(payment?.status).toBe('pending')
      expect(payment?.amount).toBe(1000)
      expect(payment?.providerRef).toBeTruthy()

      const reloadedOrder = await payload.findByID({
        collection: 'orders',
        id: order.id,
        overrideAccess: true,
        depth: 0,
      })
      expect(reloadedOrder.paymentStatus).toBe('unpaid')
    })

    it('cancels the earlier checkout of the order', async () => {
      // arrange: servedOrder(menuA); checkout(order) → first
      const order = await servedOrder(menuA)
      const first = await checkout(order)

      // act: checkout(order) → second
      const second = await checkout(order)

      // assert: first reloaded status 'cancelled'; second pending
      const reloadedFirst = await payload.findByID({
        collection: 'payments',
        id: first.id,
        overrideAccess: true,
        depth: 0,
      })
      expect(reloadedFirst.status).toBe('cancelled')
      expect(second.status).toBe('pending')
    })

    it('refuses when the business has no provider', async () => {
      // arrange: servedOrder(menuB) (test-b has none)
      const order = await servedOrder(menuB)

      // act: startOnlinePayment(payload, { orderId, returnUrl: '/menu/x' })
      const result = await startOnlinePayment(payload, { orderId: order.id, returnUrl: '/menu/x' })

      // assert: { ok: false, status: 400 }, message contains "isn't available"; no payment on the
      //   order
      expect(result).toMatchObject({
        ok: false,
        status: 400,
        message: expect.stringContaining("isn't available"),
      })

      const { docs: payments } = await payload.find({
        collection: 'payments',
        where: { order: { equals: order.id } },
        overrideAccess: true,
      })
      expect(payments).toHaveLength(0)
    })

    it('refuses a paid order', async () => {
      // arrange: servedOrder(menuA); a card payment by the cashier
      const order = await servedOrder(menuA)
      await payload.create({
        collection: 'payments',
        data: {
          order: order.id,
          tenant: tenantA.id,
          method: 'card',
          reference: 'rec-123',
          status: 'succeeded',
        },
        user: cashier,
        overrideAccess: false,
        depth: 0,
      })

      // act: startOnlinePayment(...)
      const result = await startOnlinePayment(payload, { orderId: order.id, returnUrl: '/menu/x' })

      // assert: { ok: false, status: 400 }, message contains 'already paid'
      expect(result).toMatchObject({
        ok: false,
        status: 400,
        message: expect.stringContaining('already paid'),
      })
    })

    it('refuses a return address off the site', async () => {
      // arrange: servedOrder(menuA)
      const order = await servedOrder(menuA)

      // act: startOnlinePayment(payload, { orderId, returnUrl: '//evil.example/x' })
      const result = await startOnlinePayment(payload, {
        orderId: order.id,
        returnUrl: '//evil.example/x',
      })

      // assert: { ok: false, status: 400 }; no payment on the order
      expect(result).toMatchObject({ ok: false, status: 400 })

      const { docs: payments } = await payload.find({
        collection: 'payments',
        where: { order: { equals: order.id } },
        overrideAccess: true,
      })
      expect(payments).toHaveLength(0)
    })
  })

  describe('applyWebhook', () => {
    it('marks the payment and the order paid', async () => {
      // arrange: servedOrder(menuA); checkout(order)
      const order = await servedOrder(menuA)
      const payment = await checkout(order)

      // act: applyWebhook(payload, 'test', webhook({ providerRef, status: 'succeeded', amount: 1000 }))
      const req = webhook({
        providerRef: payment.providerRef ?? '',
        status: 'succeeded',
        amount: 1000,
      })
      const result = await applyWebhook(payload, 'test', req)

      // assert: ok, outcome succeeded; payment succeeded, refundDue false; order paid and completed
      //   (served under the cashier flow)
      expect(result).toEqual({ ok: true, outcome: 'succeeded' })

      const reloadedPayment = await payload.findByID({
        collection: 'payments',
        id: payment.id,
        overrideAccess: true,
        depth: 0,
      })
      expect(reloadedPayment.status).toBe('succeeded')
      expect(reloadedPayment.refundDue).toBeFalsy()

      const reloadedOrder = await payload.findByID({
        collection: 'orders',
        id: order.id,
        overrideAccess: true,
        depth: 0,
      })
      expect(reloadedOrder.paymentStatus).toBe('paid')
      expect(reloadedOrder.status).toBe('completed')
    })

    it('ignores a repeated webhook', async () => {
      // arrange: servedOrder(menuA); checkout(order); the succeeded webhook applied once
      const order = await servedOrder(menuA)
      const payment = await checkout(order)
      const req1 = webhook({
        providerRef: payment.providerRef ?? '',
        status: 'succeeded',
        amount: 1000,
      })
      await applyWebhook(payload, 'test', req1)

      // act: the same webhook again
      const req2 = webhook({
        providerRef: payment.providerRef ?? '',
        status: 'succeeded',
        amount: 1000,
      })
      const result = await applyWebhook(payload, 'test', req2)

      // assert: ok, outcome unchanged; still one succeeded payment, order paid
      expect(result).toEqual({ ok: true, outcome: 'unchanged' })

      const { docs: payments } = await payload.find({
        collection: 'payments',
        where: {
          order: { equals: order.id },
          status: { equals: 'succeeded' },
        },
        overrideAccess: true,
      })
      expect(payments).toHaveLength(1)

      const reloadedOrder = await payload.findByID({
        collection: 'orders',
        id: order.id,
        overrideAccess: true,
        depth: 0,
      })
      expect(reloadedOrder.paymentStatus).toBe('paid')
    })

    it('fails a pending payment', async () => {
      // arrange: servedOrder(menuA); checkout(order)
      const order = await servedOrder(menuA)
      const payment = await checkout(order)

      // act: webhook({ providerRef, status: 'failed', amount: 1000 })
      const req = webhook({
        providerRef: payment.providerRef ?? '',
        status: 'failed',
        amount: 1000,
      })
      const result = await applyWebhook(payload, 'test', req)

      // assert: outcome failed; payment failed; order unpaid, still served
      expect(result).toEqual({ ok: true, outcome: 'failed' })

      const reloadedPayment = await payload.findByID({
        collection: 'payments',
        id: payment.id,
        overrideAccess: true,
        depth: 0,
      })
      expect(reloadedPayment.status).toBe('failed')

      const reloadedOrder = await payload.findByID({
        collection: 'orders',
        id: order.id,
        overrideAccess: true,
        depth: 0,
      })
      expect(reloadedOrder.paymentStatus).toBe('unpaid')
      expect(reloadedOrder.status).toBe('served')
    })

    it('flags a wrong amount for a refund', async () => {
      // arrange: servedOrder(menuA); checkout(order)
      const order = await servedOrder(menuA)
      const payment = await checkout(order)

      // act: webhook({ providerRef, status: 'succeeded', amount: 500 })
      const req = webhook({
        providerRef: payment.providerRef ?? '',
        status: 'succeeded',
        amount: 500,
      })
      await applyWebhook(payload, 'test', req)

      // assert: payment succeeded with refundDue true; order unpaid, still served
      const reloadedPayment = await payload.findByID({
        collection: 'payments',
        id: payment.id,
        overrideAccess: true,
        depth: 0,
      })
      expect(reloadedPayment.status).toBe('succeeded')
      expect(reloadedPayment.refundDue).toBe(true)

      const reloadedOrder = await payload.findByID({
        collection: 'orders',
        id: order.id,
        overrideAccess: true,
        depth: 0,
      })
      expect(reloadedOrder.paymentStatus).toBe('unpaid')
      expect(reloadedOrder.status).toBe('served')
    })

    it('records a late success on a cancelled checkout', async () => {
      // arrange: servedOrder(menuA); checkout(order) → first; checkout(order) → second (first
      //   cancelled)
      const order = await servedOrder(menuA)
      const first = await checkout(order)
      await checkout(order)

      // act: the succeeded webhook for first's providerRef
      const req = webhook({
        providerRef: first.providerRef ?? '',
        status: 'succeeded',
        amount: 1000,
      })
      await applyWebhook(payload, 'test', req)

      // assert: first succeeded, refundDue false; order paid
      const reloadedFirst = await payload.findByID({
        collection: 'payments',
        id: first.id,
        overrideAccess: true,
        depth: 0,
      })
      expect(reloadedFirst.status).toBe('succeeded')
      expect(reloadedFirst.refundDue).toBeFalsy()

      const reloadedOrder = await payload.findByID({
        collection: 'orders',
        id: order.id,
        overrideAccess: true,
        depth: 0,
      })
      expect(reloadedOrder.paymentStatus).toBe('paid')
    })

    it('flags a second success for a refund', async () => {
      // arrange: servedOrder(menuA); first and second checkouts; first's success applied (paid)
      const order = await servedOrder(menuA)
      const first = await checkout(order)
      const second = await checkout(order)

      const req1 = webhook({
        providerRef: first.providerRef ?? '',
        status: 'succeeded',
        amount: 1000,
      })
      await applyWebhook(payload, 'test', req1)

      // act: the succeeded webhook for second's providerRef
      const req2 = webhook({
        providerRef: second.providerRef ?? '',
        status: 'succeeded',
        amount: 1000,
      })
      await applyWebhook(payload, 'test', req2)

      // assert: second succeeded with refundDue true; order paid
      const reloadedSecond = await payload.findByID({
        collection: 'payments',
        id: second.id,
        overrideAccess: true,
        depth: 0,
      })
      expect(reloadedSecond.status).toBe('succeeded')
      expect(reloadedSecond.refundDue).toBe(true)

      const reloadedOrder = await payload.findByID({
        collection: 'orders',
        id: order.id,
        overrideAccess: true,
        depth: 0,
      })
      expect(reloadedOrder.paymentStatus).toBe('paid')
    })

    it('keeps the order paid when the refunded payment is voided', async () => {
      // arrange: as 'flags a second success for a refund'
      const order = await servedOrder(menuA)
      const first = await checkout(order)
      const second = await checkout(order)

      await applyWebhook(
        payload,
        'test',
        webhook({ providerRef: first.providerRef ?? '', status: 'succeeded', amount: 1000 }),
      )
      await applyWebhook(
        payload,
        'test',
        webhook({ providerRef: second.providerRef ?? '', status: 'succeeded', amount: 1000 }),
      )

      // act: the cashier voids second with voidReason 'Refunded' (overrideAccess: false)
      await payload.update({
        collection: 'payments',
        id: second.id,
        data: {
          status: 'voided',
          voidReason: 'Refunded',
        },
        user: cashier,
        overrideAccess: false,
      })

      // assert: second voided; order still paid
      const reloadedSecond = await payload.findByID({
        collection: 'payments',
        id: second.id,
        overrideAccess: true,
        depth: 0,
      })
      expect(reloadedSecond.status).toBe('voided')

      const reloadedOrder = await payload.findByID({
        collection: 'orders',
        id: order.id,
        overrideAccess: true,
        depth: 0,
      })
      expect(reloadedOrder.paymentStatus).toBe('paid')
    })

    it('refuses a webhook with a bad signature', async () => {
      // arrange: servedOrder(menuA); checkout(order); a webhook request with signature 'bad'
      const order = await servedOrder(menuA)
      const payment = await checkout(order)
      const request = webhook(
        { providerRef: payment.providerRef ?? '', status: 'succeeded', amount: 1000 },
        'bad',
      )

      // act: applyWebhook(payload, 'test', request)
      const result = await applyWebhook(payload, 'test', request)

      // assert: { ok: false, status: 400 }; payment still pending
      expect(result).toMatchObject({ ok: false, status: 400 })

      const reloadedPayment = await payload.findByID({
        collection: 'payments',
        id: payment.id,
        overrideAccess: true,
        depth: 0,
      })
      expect(reloadedPayment.status).toBe('pending')
    })

    it('refuses an unknown provider', async () => {
      // act: applyWebhook(payload, 'nope', webhook({ providerRef: 'x', status: 'succeeded', amount: 1 }))
      const request = webhook({ providerRef: 'x', status: 'succeeded', amount: 1 })
      const result = await applyWebhook(payload, 'nope', request)

      // assert: { ok: false, status: 404 }
      expect(result).toMatchObject({ ok: false, status: 404 })
    })

    it('publishes the order when it is paid online', async () => {
      // arrange: servedOrder(menuA); checkout(order); subscribeOrderEvents → events
      const order = await servedOrder(menuA)
      const payment = await checkout(order)

      const events: OrderEvent[] = []
      const unsubscribe = subscribeOrderEvents((event) => {
        if (event.order.id === order.id) {
          events.push(event)
        }
      })

      try {
        // act: the succeeded webhook
        const req = webhook({
          providerRef: payment.providerRef ?? '',
          status: 'succeeded',
          amount: 1000,
        })
        await applyWebhook(payload, 'test', req)
        await new Promise((r) => setTimeout(r, 50))

        // assert: an 'updated' event for the order with paymentStatus 'paid'; unsubscribe
        const updated = events.find((e) => e.type === 'updated')
        expect(updated).toBeDefined()
        expect(updated?.order.paymentStatus).toBe('paid')
      } finally {
        unsubscribe()
      }
    })

    it('refuses staff changing an online payment', async () => {
      // arrange: servedOrder(menuA); checkout(order)
      const order = await servedOrder(menuA)
      const payment = await checkout(order)

      // act: the cashier updates the payment to status 'succeeded' (overrideAccess: false)
      const call = payload.update({
        collection: 'payments',
        id: payment.id,
        data: { status: 'succeeded' },
        user: cashier,
        overrideAccess: false,
      })

      // assert: rejects, rejectionText contains 'payment provider'
      const text = await rejectionText(call)
      expect(text).toContain('payment provider')
    })
  })
})
