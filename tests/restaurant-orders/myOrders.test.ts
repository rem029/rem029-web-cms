// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createMyOrdersStore,
  FINISHED_KEEP_MS,
  myOrdersStorageKey,
  type MyOrder,
} from '@/app/(frontend)/menu/_store/myOrders'

// rem0018 phase 3 step 2b: the orders saved on this device (`createMyOrdersStore`).

describe('myOrders', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('keeps placed orders after a reload', async () => {
    // arrange: store A for tenant 1, add an order
    const storeA = createMyOrdersStore(1)
    storeA.getState().add({
      orderId: 42,
      orderNumber: 101,
      menuSlug: 'main',
      token: 'guest_token_123',
      placedAt: '2026-11-04T10:00:00.000Z',
    })

    // act: a new store B for tenant 1, await persist.rehydrate()
    const storeB = createMyOrdersStore(1)
    await storeB.persist.rehydrate()

    // assert: B lists the order with its token
    expect(storeB.getState().orders).toEqual([
      {
        orderId: 42,
        orderNumber: 101,
        menuSlug: 'main',
        token: 'guest_token_123',
        placedAt: '2026-11-04T10:00:00.000Z',
        finishedAt: null,
      },
    ])
  })

  it('drops finished orders after a day', async () => {
    // arrange: saved orders: finished 25 h ago, finished 1 h ago, open and placed 8 days ago,
    //          open and placed today
    const now = new Date('2026-11-04T12:00:00.000Z')
    const finished25hAgo: MyOrder = {
      orderId: 1,
      orderNumber: 1,
      menuSlug: 'lunch',
      token: 'tok-1',
      placedAt: new Date(now.getTime() - 26 * 60 * 60 * 1000).toISOString(),
      finishedAt: new Date(now.getTime() - (FINISHED_KEEP_MS + 60 * 60 * 1000)).toISOString(),
    }
    const finished1hAgo: MyOrder = {
      orderId: 2,
      orderNumber: 2,
      menuSlug: 'lunch',
      token: 'tok-2',
      placedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      finishedAt: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
    }
    const open8DaysAgo: MyOrder = {
      orderId: 3,
      orderNumber: 3,
      menuSlug: 'lunch',
      token: 'tok-3',
      placedAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      finishedAt: null,
    }
    const openToday: MyOrder = {
      orderId: 4,
      orderNumber: 4,
      menuSlug: 'lunch',
      token: 'tok-4',
      placedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      finishedAt: null,
    }

    localStorage.setItem(
      myOrdersStorageKey(1),
      JSON.stringify({
        state: {
          orders: [finished25hAgo, finished1hAgo, open8DaysAgo, openToday],
        },
        version: 0,
      }),
    )

    // act: rehydrate, prune(now)
    const store = createMyOrdersStore(1)
    await store.persist.rehydrate()
    store.getState().prune(now)

    // assert: only the one finished 1 h ago and the open one placed today remain
    expect(store.getState().orders).toEqual([finished1hAgo, openToday])
  })

  it('works when storage is blocked', async () => {
    // arrange: localStorage.getItem / setItem throw (vi.spyOn(Storage.prototype, …))
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })

    // act: create the store, rehydrate, add an order
    const store = createMyOrdersStore(1)
    await store.persist.rehydrate()
    const order = {
      orderId: 10,
      orderNumber: 5,
      menuSlug: 'lunch',
      token: 'tok-abc',
      placedAt: '2026-11-04T10:00:00.000Z',
    }
    store.getState().add(order)

    // assert: no throw; the order is in memory
    expect(store.getState().orders).toEqual([
      {
        ...order,
        finishedAt: null,
      },
    ])
  })
})
