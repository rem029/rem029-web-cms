// Orders (rem0018 phase 1 step 3a, src/collections/Orders): numbers per business day from the
// order counter, and lines priced from server data only (snapshotItems). Orders are created
// without a user, as the guest server action will (overrideAccess).
import type { Payload } from 'payload'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import type { Menu, MenuItem, Order, Tenant } from '@/payload-types'

import { rejectionText } from '../common/errors'
import { getTestPayload } from '../common/payload'
import { TEST_TENANTS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'

const context = { disableRevalidate: true }

const choiceId = (item: MenuItem, groupName: string, optionLabel: string): string => {
  const group = item.modifierGroups?.find((g) => g.name === groupName)
  const option = group?.options.find((o) => o.label === optionLabel)
  if (!option?.id) {
    throw new Error(`tests: choice ${groupName} -> ${optionLabel} not found on item ${item.id}`)
  }
  return option.id
}

type CreateOrderInput = {
  tenant: number
  menu: number
  items: {
    item: number
    quantity?: number
    unitPrice?: number
    lineTotal?: number
    selectedOptions?: { option: string }[]
  }[]
  total?: number
  subtotal?: number
  notes?: string
}

describe('orders', () => {
  let payload: Payload
  let tenantA: Tenant
  let tenantB: Tenant
  // a published test-a menu with ordering on and these items:
  // - plain: price 12.5, no choices
  // - burger: price 30, groups "Size" (required, exactly one: Regular +0, Large +5) and
  //   "Extras" (any number: Cheese +2, Bacon +3.25)
  let menu: Menu
  let plain: MenuItem
  let burger: MenuItem
  // a test-a item that is not on the menu
  let offMenu: MenuItem

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
    tenantB = await findTenant(payload, TEST_TENANTS.b)
    // create the items and the menu above (overrideAccess, context, unique titles); test-a's
    // currency is the settings default (USD, 2 digits)
    plain = await payload.create({
      collection: 'menu-items',
      data: {
        title: uniqueName('Plain'),
        price: 12.5,
        tenant: tenantA.id,
      },
      overrideAccess: true,
      context,
    })

    burger = await payload.create({
      collection: 'menu-items',
      data: {
        title: uniqueName('Burger'),
        price: 30,
        tenant: tenantA.id,
        modifierGroups: [
          {
            name: 'Size',
            inputType: 'radio',
            required: true,
            options: [
              { label: 'Regular', price: 0 },
              { label: 'Large', price: 5 },
            ],
          },
          {
            name: 'Extras',
            inputType: 'checkbox',
            required: false,
            options: [
              { label: 'Cheese', price: 2 },
              { label: 'Bacon', price: 3.25 },
            ],
          },
        ],
      },
      overrideAccess: true,
      context,
    })

    offMenu = await payload.create({
      collection: 'menu-items',
      data: {
        title: uniqueName('Off Menu'),
        price: 15,
        tenant: tenantA.id,
      },
      overrideAccess: true,
      context,
    })

    menu = await payload.create({
      collection: 'menus',
      data: {
        title: uniqueName('Menu'),
        tenant: tenantA.id,
        _status: 'published',
        items: [plain.id, burger.id],
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
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('numbers orders per tenant per day', async () => {
    // arrange: the menu above; a published test-b menu with one item
    const itemB = await payload.create({
      collection: 'menu-items',
      data: {
        title: uniqueName('Item B'),
        price: 20,
        tenant: tenantB.id,
      },
      overrideAccess: true,
      context,
    })
    const menuB = await payload.create({
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

    // act: create two test-a orders, then one test-b order
    const orderA1 = await createOrder({
      tenant: tenantA.id,
      menu: menu.id,
      items: [{ item: plain.id, quantity: 1 }],
    })
    const orderA2 = await createOrder({
      tenant: tenantA.id,
      menu: menu.id,
      items: [{ item: plain.id, quantity: 1 }],
    })
    const orderB1 = await createOrder({
      tenant: tenantB.id,
      menu: menuB.id,
      items: [{ item: itemB.id, quantity: 1 }],
    })

    // assert: the second test-a number = first + 1; both share today's orderDate; the test-b
    //         number does not follow test-a's (its own counter)
    expect(orderA2.orderNumber).toBe((orderA1.orderNumber ?? 0) + 1)
    expect(orderA1.orderDate).toBeDefined()
    expect(orderA2.orderDate).toBe(orderA1.orderDate)
    expect(orderB1.orderNumber).not.toBe((orderA2.orderNumber ?? 0) + 1)
  })

  it('restarts numbering on a new business day', async () => {
    // arrange: vi.useFakeTimers({ toFake: ['Date'] }); setSystemTime to a day no other test uses
    //          (2030-01-15T12:00:00Z)
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2030-01-15T12:00:00Z'))

    // act: create two orders; move the clock one day on; create one more
    const order1 = await createOrder({
      tenant: tenantA.id,
      menu: menu.id,
      items: [{ item: plain.id, quantity: 1 }],
    })
    const order2 = await createOrder({
      tenant: tenantA.id,
      menu: menu.id,
      items: [{ item: plain.id, quantity: 1 }],
    })

    vi.setSystemTime(new Date('2030-01-16T12:00:00Z'))
    const order3 = await createOrder({
      tenant: tenantA.id,
      menu: menu.id,
      items: [{ item: plain.id, quantity: 1 }],
    })

    // assert: 1 and 2 on 2030-01-15, then 1 on 2030-01-16 (orderDate changes with it)
    expect(order1.orderNumber).toBe(1)
    expect(order1.orderDate).toBe('2030-01-15')
    expect(order2.orderNumber).toBe(2)
    expect(order2.orderDate).toBe('2030-01-15')
    expect(order3.orderNumber).toBe(1)
    expect(order3.orderDate).toBe('2030-01-16')
  })

  it('numbers concurrent orders without duplicates', async () => {
    // arrange: the menu above
    // act: Promise.all of 5 order creates at once
    const orders = await Promise.all([
      createOrder({
        tenant: tenantA.id,
        menu: menu.id,
        items: [{ item: plain.id, quantity: 1 }],
      }),
      createOrder({
        tenant: tenantA.id,
        menu: menu.id,
        items: [{ item: plain.id, quantity: 1 }],
      }),
      createOrder({
        tenant: tenantA.id,
        menu: menu.id,
        items: [{ item: plain.id, quantity: 1 }],
      }),
      createOrder({
        tenant: tenantA.id,
        menu: menu.id,
        items: [{ item: plain.id, quantity: 1 }],
      }),
      createOrder({
        tenant: tenantA.id,
        menu: menu.id,
        items: [{ item: plain.id, quantity: 1 }],
      }),
    ])

    // assert: 5 different numbers, consecutive (max - min = 4)
    const numbers = orders
      .map((order) => order.orderNumber)
      .filter((n): n is number => typeof n === 'number')
    expect(new Set(numbers).size).toBe(5)
    const min = Math.min(...numbers)
    const max = Math.max(...numbers)
    expect(max - min).toBe(4)
  })

  it('snapshots the price at order time', async () => {
    // arrange: an order with one `plain`
    const order = await createOrder({
      tenant: tenantA.id,
      menu: menu.id,
      items: [{ item: plain.id, quantity: 1 }],
    })

    // act: change plain's price to 99 (overrideAccess); read the order again
    try {
      await payload.update({
        collection: 'menu-items',
        id: plain.id,
        data: { price: 99 },
        overrideAccess: true,
        context,
      })
      const reloadedOrder = await payload.findByID({
        collection: 'orders',
        id: order.id,
        overrideAccess: true,
      })
      const reloadedPlain = await payload.findByID({
        collection: 'menu-items',
        id: plain.id,
        overrideAccess: true,
      })

      // assert: the order line keeps title and unitPrice 1250; the item now costs 99
      //         (restore the price after, other tests read it)
      expect(reloadedOrder.items?.[0]?.title).toBe(plain.title)
      expect(reloadedOrder.items?.[0]?.unitPrice).toBe(1250)
      expect(reloadedPlain.price).toBe(99)
    } finally {
      await payload.update({
        collection: 'menu-items',
        id: plain.id,
        data: { price: 12.5 },
        overrideAccess: true,
        context,
      })
    }
  })

  it('drops unknown options', async () => {
    // arrange: a burger line with Regular and a choice id that is not on the item
    const regularId = choiceId(burger, 'Size', 'Regular')

    // act: create the order
    const order = await createOrder({
      tenant: tenantA.id,
      menu: menu.id,
      items: [
        {
          item: burger.id,
          quantity: 1,
          selectedOptions: [{ option: regularId }, { option: 'unknown-option-id' }],
        },
      ],
    })

    // assert: saved; selectedOptions holds Regular only
    expect(order.items?.[0]?.selectedOptions).toHaveLength(1)
    expect(order.items?.[0]?.selectedOptions?.[0]?.option).toBe(regularId)
  })

  it('refuses a missing required option', async () => {
    // arrange: a burger line without a Size
    const prevOrder = await createOrder({
      tenant: tenantA.id,
      menu: menu.id,
      items: [{ item: plain.id, quantity: 1 }],
    })

    // act: create the order
    const call = createOrder({
      tenant: tenantA.id,
      menu: menu.id,
      items: [
        {
          item: burger.id,
          quantity: 1,
        },
      ],
    })

    // assert: rejects with 400 naming "Size"; no order number used (the next order's number is
    //         the one before + 1)
    await expect(call).rejects.toMatchObject({ status: 400 })
    const text = await rejectionText(call)
    expect(text).toMatch(/Size/)

    const nextOrder = await createOrder({
      tenant: tenantA.id,
      menu: menu.id,
      items: [{ item: plain.id, quantity: 1 }],
    })
    expect(nextOrder.orderNumber).toBe((prevOrder.orderNumber ?? 0) + 1)
  })

  it('adds the chosen extras to the line price', async () => {
    // arrange: 2 × burger with Large, Cheese and Bacon; a caller-sent unitPrice 1 and lineTotal 1
    const largeId = choiceId(burger, 'Size', 'Large')
    const cheeseId = choiceId(burger, 'Extras', 'Cheese')
    const baconId = choiceId(burger, 'Extras', 'Bacon')

    // act: create the order
    const order = await createOrder({
      tenant: tenantA.id,
      menu: menu.id,
      items: [
        {
          item: burger.id,
          quantity: 2,
          unitPrice: 1,
          lineTotal: 1,
          selectedOptions: [{ option: largeId }, { option: cheeseId }, { option: baconId }],
        },
      ],
    })

    // assert: unitPrice 3000; choices priced 500, 200, 325; lineTotal (3000 + 1025) × 2 = 8050
    //         (the caller's numbers ignored)
    const line = order.items?.[0]
    expect(line?.unitPrice).toBe(3000)
    expect(line?.lineTotal).toBe(8050)
    const choices = line?.selectedOptions
    expect(choices?.find((c) => c.option === largeId)?.price).toBe(500)
    expect(choices?.find((c) => c.option === cheeseId)?.price).toBe(200)
    expect(choices?.find((c) => c.option === baconId)?.price).toBe(325)
  })

  it('keeps one choice in an exactly-one group', async () => {
    // arrange: a burger line with both Regular and Large
    const regularId = choiceId(burger, 'Size', 'Regular')
    const largeId = choiceId(burger, 'Size', 'Large')

    // act: create the order
    const call = createOrder({
      tenant: tenantA.id,
      menu: menu.id,
      items: [
        {
          item: burger.id,
          quantity: 1,
          selectedOptions: [{ option: regularId }, { option: largeId }],
        },
      ],
    })

    // assert: rejects with 400 naming "Size"
    await expect(call).rejects.toMatchObject({ status: 400 })
    const text = await rejectionText(call)
    expect(text).toMatch(/Size/)
  })

  it('refuses an item that is not on the menu', async () => {
    // arrange: a line with `offMenu`
    // act: create the order
    const call = createOrder({
      tenant: tenantA.id,
      menu: menu.id,
      items: [
        {
          item: offMenu.id,
          quantity: 1,
        },
      ],
    })

    // assert: rejects with 400 naming the item's title
    await expect(call).rejects.toMatchObject({ status: 400 })
    const text = await rejectionText(call)
    expect(text).toMatch(new RegExp(offMenu.title))
  })

  it('totals the order in minor units', async () => {
    // arrange: 3 × plain (12.5) and 1 × burger with Regular (30)
    const regularId = choiceId(burger, 'Size', 'Regular')

    // act: create the order with a caller-sent total 1
    const order = await createOrder({
      tenant: tenantA.id,
      menu: menu.id,
      total: 1,
      subtotal: 1,
      items: [
        {
          item: plain.id,
          quantity: 3,
        },
        {
          item: burger.id,
          quantity: 1,
          selectedOptions: [{ option: regularId }],
        },
      ],
    })

    // assert: subtotal and total 3750 + 3000 = 6750, balance 6750, amountPaid 0, paymentStatus
    //         unpaid, currency USD, flow and showPrices from the menu
    expect(order.subtotal).toBe(6750)
    expect(order.total).toBe(6750)
    expect(order.balance).toBe(6750)
    expect(order.amountPaid).toBe(0)
    expect(order.paymentStatus).toBe('unpaid')
    expect(order.currency).toBe('USD')
    expect(order.flow).toBe(menu.ordering?.flow)
    expect(order.showPrices).toBe(menu.ordering?.showPrices)
  })
})
