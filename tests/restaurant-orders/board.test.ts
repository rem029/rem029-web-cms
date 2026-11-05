// The staff boards' server side (rem0018 phase 4 step 1, src/collections/Orders/utils/board.ts):
// lists, moves, payments and guest requests, each a Local API call as the board's user.
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import {
  clearAssistance,
  getBoardContext,
  HISTORY_PAGE_SIZE,
  listBoardOrders,
  listRefundDue,
  moveOrder,
  recordPayment,
  voidPayment,
} from '@/collections/Orders/utils/board'
import type { Menu, MenuItem, Order, Tenant } from '@/payload-types'

import { getTestPayload } from '../common/payload'
import { TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'
import { loadUser, type SessionUser } from '../common/users'

// the arrangement (beforeAll):
// - test-a: one item at 10.00; menu WKC (published, ordering on, flow `waiter_kitchen_cashier`,
//   staff [waiter, kitchen, cashier]); menu W2 (published, ordering on, staff [] : the board users
//   don't work it); test-b: a published menu with ordering on, staff [otherWaiter]
// - users: superUser, tenantAdmin, waiter, kitchen, cashier, member, otherWaiter (loadUser)
// - a helper `orderAt(status, menu = WKC)`: a guest order walked to `status` as the super user
//   (as closeOrder.test.ts)
// - context { disableRevalidate: true } on every create

const context = { disableRevalidate: true }

describe('board', () => {
  let payload: Payload
  let tenantA: Tenant
  let tenantB: Tenant
  let superUser: SessionUser
  let _tenantAdmin: SessionUser
  let waiter: SessionUser
  let kitchen: SessionUser
  let cashier: SessionUser
  let member: SessionUser
  let otherWaiter: SessionUser
  let itemA: MenuItem
  let itemB: MenuItem
  let menuWKC: Menu
  let menuW2: Menu
  let menuB: Menu

  const orderAt = async (
    status: 'pending' | 'confirmed' | 'preparing' | 'prepared' | 'served',
    menu: Menu = menuWKC,
    tenant: Tenant = tenantA,
    item: MenuItem = itemA,
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
      context,
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
    tenantB = await findTenant(payload, TEST_TENANTS.b)
    superUser = await loadUser(payload, TEST_USERS.superUser)
    _tenantAdmin = await loadUser(payload, TEST_USERS.tenantAdmin)
    waiter = await loadUser(payload, TEST_USERS.waiter)
    kitchen = await loadUser(payload, TEST_USERS.kitchen)
    cashier = await loadUser(payload, TEST_USERS.cashier)
    member = await loadUser(payload, TEST_USERS.member)
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

  describe('getBoardContext', () => {
    it('refuses a user without a staff role', async () => {
      // arrange: member (no board row in test-a)
      // act: getBoardContext(payload, member, test-a)
      // assert: rejects with status 403
      await expect(getBoardContext(payload, member, tenantA.id)).rejects.toMatchObject({
        status: 403,
      })
    })

    it('lists only the menus the user works', async () => {
      // arrange: waiter
      // act: getBoardContext(payload, waiter, test-a)
      // assert: roles ['waiter']; menus contain WKC and not W2; today is a YYYY-MM-DD string
      const ctx = await getBoardContext(payload, waiter, tenantA.id)
      expect(ctx.roles).toEqual(['waiter'])
      const menuIds = ctx.menus.map((m) => m.id)
      expect(menuIds).toContain(menuWKC.id)
      expect(menuIds).not.toContain(menuW2.id)
      expect(ctx.today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  describe('moveOrder', () => {
    it('moves an order the role owns', async () => {
      // arrange: orderAt('pending')
      // act: moveOrder(waiter, { orderId, status: 'confirmed' })
      // assert: the returned order's status is 'confirmed', confirmedAt set
      const order = await orderAt('pending')
      const moved = await moveOrder(payload, waiter, {
        orderId: order.id,
        status: 'confirmed',
      })
      expect(moved.status).toBe('confirmed')
      expect(moved.confirmedAt).toBeTruthy()
    })

    it('refuses a move the role does not own', async () => {
      // arrange: orderAt('confirmed')
      // act: moveOrder(waiter, { orderId, status: 'preparing' })
      // assert: rejects with status 403; the order is still 'confirmed'
      const order = await orderAt('confirmed')
      await expect(
        moveOrder(payload, waiter, {
          orderId: order.id,
          status: 'preparing',
        }),
      ).rejects.toMatchObject({ status: 403 })
      const reloaded = await payload.findByID({
        collection: 'orders',
        id: order.id,
        overrideAccess: true,
      })
      expect(reloaded.status).toBe('confirmed')
    })

    it('moves an order back one step', async () => {
      // arrange: orderAt('prepared')
      // act: moveOrder(kitchen, { orderId, status: 'preparing' })
      // assert: status 'preparing'
      const order = await orderAt('prepared')
      const moved = await moveOrder(payload, kitchen, {
        orderId: order.id,
        status: 'preparing',
      })
      expect(moved.status).toBe('preparing')
    })

    it('refuses a cashier cancel once preparing', async () => {
      // arrange: orderAt('preparing')
      // act: moveOrder(cashier, { orderId, status: 'cancelled', cancelReason: 'Guest left' })
      // assert: rejects with status 403
      const order = await orderAt('preparing')
      await expect(
        moveOrder(payload, cashier, {
          orderId: order.id,
          status: 'cancelled',
          cancelReason: 'Guest left',
        }),
      ).rejects.toMatchObject({ status: 403 })
    })

    it('lets the kitchen cancel while preparing', async () => {
      // arrange: orderAt('preparing')
      // act: moveOrder(kitchen, { orderId, status: 'cancelled', cancelReason: 'Out of fish' })
      // assert: status 'cancelled', cancelReason 'Out of fish'
      const order = await orderAt('preparing')
      const moved = await moveOrder(payload, kitchen, {
        orderId: order.id,
        status: 'cancelled',
        cancelReason: 'Out of fish',
      })
      expect(moved.status).toBe('cancelled')
      expect(moved.cancelReason).toBe('Out of fish')
    })

    it('refuses an order of another tenant', async () => {
      // arrange: an order in test-b (pending)
      // act: moveOrder(waiter, { orderId: <test-b order>, status: 'confirmed' })
      // assert: rejects with status 404 (not found for this user); the order is still 'pending'
      const order = await orderAt('pending', menuB, tenantB, itemB)
      await expect(
        moveOrder(payload, waiter, {
          orderId: order.id,
          status: 'confirmed',
        }),
      ).rejects.toMatchObject({ status: 404 })
      const reloaded = await payload.findByID({
        collection: 'orders',
        id: order.id,
        overrideAccess: true,
      })
      expect(reloaded.status).toBe('pending')
    })
  })

  describe('payments', () => {
    it('records a payment from the cashier board', async () => {
      // arrange: orderAt('served')
      // act: recordPayment(cashier, { orderId, method: 'cash', received: 2000 })
      // assert: payment status 'succeeded', amount = the order's total (1000), takenBy cashier;
      //         the order is now paid and completed (cashier flow)
      const order = await orderAt('served')
      const payment = await recordPayment(payload, cashier, {
        orderId: order.id,
        method: 'cash',
        received: 2000,
      })
      expect(payment.status).toBe('succeeded')
      expect(payment.amount).toBe(1000)
      const takenById =
        typeof payment.takenBy === 'object' && payment.takenBy !== null
          ? payment.takenBy.id
          : payment.takenBy
      expect(takenById).toBe(cashier.id)
      const reloaded = await payload.findByID({
        collection: 'orders',
        id: order.id,
        overrideAccess: true,
      })
      expect(reloaded.paymentStatus).toBe('paid')
      expect(reloaded.status).toBe('completed')
    })

    it('voids a payment with a reason', async () => {
      // arrange: orderAt('served'), recordPayment(cashier, card with reference 'R-1')
      // act: voidPayment(cashier, { paymentId, reason: 'Wrong card' })
      // assert: payment status 'voided', voidReason 'Wrong card'; the order's paymentStatus is
      //         'unpaid' again
      const order = await orderAt('served')
      const payment = await recordPayment(payload, cashier, {
        orderId: order.id,
        method: 'card',
        reference: 'R-1',
      })
      const voided = await voidPayment(payload, cashier, {
        paymentId: payment.id,
        reason: 'Wrong card',
      })
      expect(voided.status).toBe('voided')
      expect(voided.voidReason).toBe('Wrong card')
      const reloaded = await payload.findByID({
        collection: 'orders',
        id: order.id,
        overrideAccess: true,
      })
      expect(reloaded.paymentStatus).toBe('unpaid')
    })
  })

  describe('listBoardOrders', () => {
    it('lists active orders of the role', async () => {
      // arrange: orderAt('pending') and orderAt('confirmed')
      // act: listBoardOrders(kitchen, { tenantId: test-a, role: 'kitchen', list: 'active' })
      // assert: contains the confirmed order, not the pending one
      const pending = await orderAt('pending')
      const confirmed = await orderAt('confirmed')
      const result = await listBoardOrders(payload, kitchen, {
        tenantId: tenantA.id,
        role: 'kitchen',
        list: 'active',
      })
      const ids = result.orders.map((o) => o.id)
      expect(ids).toContain(confirmed.id)
      expect(ids).not.toContain(pending.id)
    })

    it('lists unpaid orders for the cashier', async () => {
      // arrange: orderAt('served') unpaid; another served and paid (recordPayment)
      // act: listBoardOrders(cashier, { list: 'unpaid' })
      // assert: contains the unpaid one, not the paid one
      const unpaidOrder = await orderAt('served')
      const paidOrder = await orderAt('served')
      await recordPayment(payload, cashier, {
        orderId: paidOrder.id,
        method: 'cash',
        received: 1000,
      })
      const result = await listBoardOrders(payload, cashier, {
        tenantId: tenantA.id,
        role: 'cashier',
        list: 'unpaid',
      })
      const ids = result.orders.map((o) => o.id)
      expect(ids).toContain(unpaidOrder.id)
      expect(ids).not.toContain(paidOrder.id)
    })

    it('lists open orders from earlier days', async () => {
      // arrange: orderAt('confirmed'), its orderDate set to yesterday's business day
      //          (overrideAccess update); orderAt('confirmed') of today
      // act: listBoardOrders(cashier, { list: 'earlier' })
      // assert: contains yesterday's order, not today's
      const yesterdayOrder = await orderAt('confirmed')
      const todayOrder = await orderAt('confirmed')
      const d = new Date()
      d.setUTCDate(d.getUTCDate() - 1)
      const yesterday = d.toISOString().slice(0, 10)
      await payload.update({
        collection: 'orders',
        id: yesterdayOrder.id,
        data: { orderDate: yesterday },
        overrideAccess: true,
      })
      const result = await listBoardOrders(payload, cashier, {
        tenantId: tenantA.id,
        role: 'cashier',
        list: 'earlier',
      })
      const ids = result.orders.map((o) => o.id)
      expect(ids).toContain(yesterdayOrder.id)
      expect(ids).not.toContain(todayOrder.id)
    })

    it('lists history by business day', async () => {
      // arrange: two cancelled orders, one with orderDate yesterday
      // act: listBoardOrders(waiter, { list: 'history', date: <yesterday> })
      // assert: contains yesterday's order, not today's
      const d = new Date()
      d.setUTCDate(d.getUTCDate() - 1)
      const yesterday = d.toISOString().slice(0, 10)

      const yesterdayOrder = await orderAt('pending')
      await payload.update({
        collection: 'orders',
        id: yesterdayOrder.id,
        data: {
          status: 'cancelled',
          cancelReason: 'Cancelled yesterday',
          orderDate: yesterday,
        },
        user: superUser,
        overrideAccess: true,
      })

      const todayOrder = await orderAt('pending')
      await payload.update({
        collection: 'orders',
        id: todayOrder.id,
        data: {
          status: 'cancelled',
          cancelReason: 'Cancelled today',
        },
        user: superUser,
        overrideAccess: true,
      })

      const result = await listBoardOrders(payload, waiter, {
        tenantId: tenantA.id,
        role: 'waiter',
        list: 'history',
        date: yesterday,
      })
      const ids = result.orders.map((o) => o.id)
      expect(ids).toContain(yesterdayOrder.id)
      expect(ids).not.toContain(todayOrder.id)
    })

    it('pages the history', async () => {
      // arrange: HISTORY_PAGE_SIZE + 1 cancelled orders on a business day of their own (orderDate
      //          set to a fixed past day with overrideAccess, so other tests' rows don't count)
      // act: listBoardOrders(waiter, { list: 'history', date: <that day>, page: 2 })
      // assert: page 2, totalPages 2, one order
      const fixedDay = '2020-01-01'
      const createOrder = async (i: number) => {
        const order = await payload.create({
          collection: 'orders',
          data: {
            tenant: tenantA.id,
            menu: menuWKC.id,
            status: 'pending',
            source: 'guest',
            type: 'dine_in',
            paymentStatus: 'unpaid',
            guestName: uniqueName(`Guest ${i}`),
            items: [{ item: itemA.id, quantity: 1 }],
          },
          overrideAccess: true,
          context,
        })
        return payload.update({
          collection: 'orders',
          id: order.id,
          data: {
            status: 'cancelled',
            cancelReason: 'Page history test',
            orderDate: fixedDay,
          },
          user: superUser,
          overrideAccess: true,
        })
      }

      // one at a time: concurrent creates queue on the order counter row and hold the pool
      for (let i = 0; i <= HISTORY_PAGE_SIZE; i++) {
        await createOrder(i)
      }

      const result = await listBoardOrders(payload, waiter, {
        tenantId: tenantA.id,
        role: 'waiter',
        list: 'history',
        date: fixedDay,
        page: 2,
      })
      expect(result.page).toBe(2)
      expect(result.totalPages).toBe(2)
      expect(result.orders).toHaveLength(1)
      // 51 orders through every hook: longer than the default 30 s
    }, 120_000)

    it('refuses the cashier lists to a waiter', async () => {
      // act: listBoardOrders(waiter, { role: 'waiter', list: 'unpaid' })
      // assert: rejects with status 403
      await expect(
        listBoardOrders(payload, waiter, {
          tenantId: tenantA.id,
          role: 'waiter',
          list: 'unpaid',
        }),
      ).rejects.toMatchObject({ status: 403 })
    })
  })

  describe('listRefundDue', () => {
    it('lists refund due payments', async () => {
      // arrange: a succeeded payment with refundDue true on an order of WKC (overrideAccess
      //          create, as onlinePayments.test.ts does), and an ordinary one
      // act: listRefundDue(cashier, test-a)
      // assert: contains the refund due payment only
      const order1 = await orderAt('served')
      const order2 = await orderAt('served')
      const refundPayment = await payload.create({
        collection: 'payments',
        data: {
          order: order1.id,
          tenant: tenantA.id,
          method: 'cash',
          status: 'succeeded',
          refundDue: true,
        },
        overrideAccess: true,
        context,
      })
      const ordinaryPayment = await payload.create({
        collection: 'payments',
        data: {
          order: order2.id,
          tenant: tenantA.id,
          method: 'cash',
          status: 'succeeded',
        },
        overrideAccess: true,
        context,
      })

      const result = await listRefundDue(payload, cashier, tenantA.id)
      const ids = result.map((p) => p.id)
      expect(ids).toContain(refundPayment.id)
      expect(ids).not.toContain(ordinaryPayment.id)
    })
  })

  describe('clearAssistance', () => {
    it('clears a bill request', async () => {
      // arrange: orderAt('served') with billRequestedAt set (overrideAccess update)
      // act: clearAssistance(cashier, { orderId, kind: 'bill' })
      // assert: billRequestedAt null on the returned order and on a fresh read
      const order = await orderAt('served')
      await payload.update({
        collection: 'orders',
        id: order.id,
        data: { billRequestedAt: new Date().toISOString() },
        overrideAccess: true,
      })
      const cleared = await clearAssistance(payload, cashier, {
        orderId: order.id,
        kind: 'bill',
      })
      expect(cleared.billRequestedAt).toBeNull()
      const fresh = await payload.findByID({
        collection: 'orders',
        id: order.id,
        overrideAccess: true,
      })
      expect(fresh.billRequestedAt).toBeNull()
    })

    it('lets the kitchen clear a staff call', async () => {
      // arrange: orderAt('confirmed') with assistanceRequestedAt set
      // act: clearAssistance(kitchen, { orderId, kind: 'staff' })
      // assert: assistanceRequestedAt null on the returned order
      const order = await orderAt('confirmed')
      await payload.update({
        collection: 'orders',
        id: order.id,
        data: { assistanceRequestedAt: new Date().toISOString() },
        overrideAccess: true,
      })
      const cleared = await clearAssistance(payload, kitchen, {
        orderId: order.id,
        kind: 'staff',
      })
      expect(cleared.assistanceRequestedAt).toBeNull()
    })
  })
})
