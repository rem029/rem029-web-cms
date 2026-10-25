// Orders access (rem0018 phase 1 step 3a, src/collections/Orders/utils/access.ts): staff need
// both the profile's `orders` op and a published menu that lists them.
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import type { Order, Tenant } from '@/payload-types'

import { getTestPayload } from '../common/payload'
import { TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'
import { loadUser, type SessionUser } from '../common/users'

const context = { disableRevalidate: true }

type CreateOrderInput = {
  tenant: number
  menu: number
  items: {
    item: number
    quantity?: number
  }[]
}

describe('orders access', () => {
  let payload: Payload
  let tenantA: Tenant
  let waiter: SessionUser
  let kitchen: SessionUser
  // two published test-a menus with ordering on and one item each: `staffed` lists the waiter
  // and the kitchen user, `unstaffed` lists nobody; one order on each
  let staffedOrder: Order
  let unstaffedOrder: Order

  const createOrder = (data: CreateOrderInput): Promise<Order> =>
    payload.create({
      collection: 'orders',
      data: {
        status: 'pending',
        source: 'guest',
        type: 'dine_in',
        paymentStatus: 'unpaid',
        ...data,
        items: data.items.map((item) => ({
          quantity: 1,
          ...item,
        })),
      },
      overrideAccess: true,
    })

  beforeAll(async () => {
    payload = await getTestPayload()
    tenantA = await findTenant(payload, TEST_TENANTS.a)
    waiter = await loadUser(payload, TEST_USERS.waiter)
    kitchen = await loadUser(payload, TEST_USERS.kitchen)
    // create the menus, items and orders above (overrideAccess, unique titles)
    const itemStaffed = await payload.create({
      collection: 'menu-items',
      data: {
        title: uniqueName('Item Staffed'),
        price: 10,
        tenant: tenantA.id,
      },
      overrideAccess: true,
      context,
    })

    const itemUnstaffed = await payload.create({
      collection: 'menu-items',
      data: {
        title: uniqueName('Item Unstaffed'),
        price: 15,
        tenant: tenantA.id,
      },
      overrideAccess: true,
      context,
    })

    const menuStaffed = await payload.create({
      collection: 'menus',
      data: {
        title: uniqueName('Menu Staffed'),
        tenant: tenantA.id,
        _status: 'published',
        items: [itemStaffed.id],
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

    const menuUnstaffed = await payload.create({
      collection: 'menus',
      data: {
        title: uniqueName('Menu Unstaffed'),
        tenant: tenantA.id,
        _status: 'published',
        items: [itemUnstaffed.id],
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

    staffedOrder = await createOrder({
      tenant: tenantA.id,
      menu: menuStaffed.id,
      items: [{ item: itemStaffed.id, quantity: 1 }],
    })

    unstaffedOrder = await createOrder({
      tenant: tenantA.id,
      menu: menuUnstaffed.id,
      items: [{ item: itemUnstaffed.id, quantity: 1 }],
    })
  })

  it('shows staff the orders of their menus only', async () => {
    // arrange: the waiter (waiter template: orders read + update, from the step 3a migration)
    // act: find orders as the waiter (overrideAccess: false), where id in both orders
    const { docs } = await payload.find({
      collection: 'orders',
      where: {
        id: { in: [staffedOrder.id, unstaffedOrder.id] },
      },
      user: waiter,
      overrideAccess: false,
    })

    // assert: staffedOrder only
    expect(docs).toHaveLength(1)
    expect(docs[0]?.id).toBe(staffedOrder.id)
  })

  it('hides orders from staff not listed on the menu', async () => {
    // arrange: the kitchen user, listed on `staffed` only
    // act: findByID unstaffedOrder as the kitchen user (overrideAccess: false)
    const call = payload.findByID({
      collection: 'orders',
      id: unstaffedOrder.id,
      user: kitchen,
      overrideAccess: false,
    })

    // assert: rejects with 404 (not found, so the order's existence doesn't leak)
    await expect(call).rejects.toMatchObject({ status: 404 })
  })

  it('refuses staff whose profile lacks orders update', async () => {
    // arrange: a new test-a profile with order-waiter read, menus read and orders read only
    //          (no update), a new test-a user on it, listed on a new published menu with an order
    const profileSlug = uniqueName('profile-orders-read')
    const emptyProfile = await payload.create({
      collection: 'users-access',
      data: {
        name: profileSlug,
        slug: profileSlug,
        tenant: tenantA.id,
      },
      overrideAccess: true,
    })

    const access = (emptyProfile.access ?? []).map((row) => ({
      slug: row.slug,
      hidden: row.hidden,
      read: row.slug === 'order-waiter' || row.slug === 'menus' || row.slug === 'orders',
      create: false,
      update: false,
      delete: false,
      admin: false,
      access: false,
    }))

    const profile = await payload.update({
      collection: 'users-access',
      id: emptyProfile.id,
      data: { access },
      overrideAccess: true,
    })

    const email = `${uniqueName('waiter-read-only')}@example.test`
    const createdUser = await payload.create({
      collection: 'users',
      data: {
        email,
        name: email,
        password: email,
        tenants: [{ tenant: tenantA.id, access: profile.id }],
      },
      overrideAccess: true,
    })

    const user = await loadUser(payload, createdUser.email)

    const item = await payload.create({
      collection: 'menu-items',
      data: {
        title: uniqueName('Item Read Only'),
        price: 25,
        tenant: tenantA.id,
      },
      overrideAccess: true,
      context,
    })

    const menu = await payload.create({
      collection: 'menus',
      data: {
        title: uniqueName('Menu Read Only'),
        tenant: tenantA.id,
        _status: 'published',
        items: [item.id],
        ordering: {
          enabled: true,
          flow: 'waiter_kitchen_cashier',
          showPrices: true,
          staff: [user.id],
        },
      },
      draft: false,
      overrideAccess: true,
      context,
    })

    const order = await createOrder({
      tenant: tenantA.id,
      menu: menu.id,
      items: [{ item: item.id, quantity: 1 }],
    })

    // act: update that order's notes as that user (overrideAccess: false)
    const updateCall = payload.update({
      collection: 'orders',
      id: order.id,
      data: { notes: 'Updated notes' },
      user,
      overrideAccess: false,
    })

    // assert: rejects with 403; reading it as that user works
    await expect(updateCall).rejects.toMatchObject({ status: 403 })

    const readDoc = await payload.findByID({
      collection: 'orders',
      id: order.id,
      user,
      overrideAccess: false,
    })
    expect(readDoc.id).toBe(order.id)
  })

  it('shows the business name to super users only', async () => {
    // arrange: the super user and the waiter, staffedOrder on test-a
    const superUser = await loadUser(payload, TEST_USERS.superUser)

    // act: findByID staffedOrder as each (overrideAccess: false)
    const asSuperUser = await payload.findByID({
      collection: 'orders',
      id: staffedOrder.id,
      user: superUser,
      overrideAccess: false,
    })
    const asWaiter = await payload.findByID({
      collection: 'orders',
      id: staffedOrder.id,
      user: waiter,
      overrideAccess: false,
    })

    // assert: the super user reads test-a's name as `business`, the waiter gets no `business`
    expect(asSuperUser.business).toBe(tenantA.name)
    expect(asWaiter.business).toBeUndefined()
  })
})
