// @vitest-environment jsdom
// An item's detail view on the guest menu (rem0017 phase 3 step 3, `src/app/(frontend)/menu/
// _components/ItemView.tsx`): read-only until rem0018 adds ordering.
import { describe, expect, it } from 'vitest'

describe('ItemView', () => {
  it('shows the price in the tenant currency', () => {
    // arrange: an item with price 12.5, currency 'QAR', locale 'en'
    // act: render <ItemView … />
    // assert: shows formatPrice(12.5, 'QAR', 'en')
    expect.fail('not implemented')
  })

  it('lists options read only', () => {
    // arrange: a modifier group 'Size' with Small, Large
    // act: render
    // assert: 'Size', 'Small', 'Large' are shown and there is no input to pick them
    expect.fail('not implemented')
  })

  it('lists allergens and tags', () => {
    // arrange: allergen 'Nuts', tag 'Vegan'
    // act: render
    // assert: both are shown
    expect.fail('not implemented')
  })
})
