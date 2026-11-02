// @vitest-environment jsdom
// The guest's cart (rem0018 phase 3 step 2a, src/app/(frontend)/menu/_store/cart.ts): kept in
// localStorage per tenant and menu, ids and quantities only.
import { beforeEach, describe, expect, it } from 'vitest'

import { createCartStore } from '@/app/(frontend)/menu/_store/cart'

// arrangement: localStorage.clear() before each; stores made with createCartStore(tenantId,
// menuSlug) (the provider is a thin wrapper); a reload = a new store on the same key after the
// persist middleware has written (await store.persist.rehydrate())

describe('cart', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('keeps the cart per menu', async () => {
    // arrange: tenant 1 menu "corniche" store: addLine(item 7, ['large'], 2); tenant 1 menu
    //   "iftar" store: addLine(item 8, [], 1)
    const cornicheStore = createCartStore(1, 'corniche')
    cornicheStore.getState().addLine({ itemId: 7, optionIds: ['large'], quantity: 2 })
    const iftarStore = createCartStore(1, 'iftar')
    iftarStore.getState().addLine({ itemId: 8, optionIds: [], quantity: 1 })

    // act: a new store for tenant 1 "corniche" (a reload)
    const reloadedStore = createCartStore(1, 'corniche')
    await reloadedStore.persist.rehydrate()

    // assert: one line, item 7, ['large'], quantity 2; the "iftar" store's line isn't in it;
    //   localStorage has `orders-cart:1:corniche` and `orders-cart:1:iftar`
    const lines = reloadedStore.getState().lines
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatchObject({
      itemId: 7,
      optionIds: ['large'],
      quantity: 2,
    })
    expect(lines.find((line) => line.itemId === 8)).toBeUndefined()
    expect(localStorage.getItem('orders-cart:1:corniche')).not.toBeNull()
    expect(localStorage.getItem('orders-cart:1:iftar')).not.toBeNull()
  })

  it('drops lines whose item left the menu', () => {
    // arrange: lines for item 7 (['large']), item 8 ([]) and item 9 (['oat'])
    const store = createCartStore(1, 'corniche')
    store.getState().addLine({ itemId: 7, optionIds: ['large'], quantity: 1 })
    store.getState().addLine({ itemId: 8, optionIds: [], quantity: 1 })
    store.getState().addLine({ itemId: 9, optionIds: ['oat'], quantity: 1 })

    // act: keepItems([{ itemId: 7, optionIds: ['large', 'small'] }, { itemId: 9, optionIds: [] }])
    store.getState().keepItems([
      { itemId: 7, optionIds: ['large', 'small'] },
      { itemId: 9, optionIds: [] },
    ])

    // assert: only item 7 stays (item 8 left the menu, item 9's 'oat' choice is gone)
    const lines = store.getState().lines
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatchObject({
      itemId: 7,
      optionIds: ['large'],
    })
    expect(lines.find((line) => line.itemId === 8)).toBeUndefined()
    expect(lines.find((line) => line.itemId === 9)).toBeUndefined()
  })
})
