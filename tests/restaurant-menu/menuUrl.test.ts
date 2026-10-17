// The menu's shareable url state (rem0017 phase 3 step 3, `src/app/(frontend)/menu/_data/
// menuUrl.ts`): pure, no db.
import { describe, expect, it } from 'vitest'

describe('parseMenuUrl', () => {
  it('reads the item, category, allergens and period', () => {
    // arrange: ?item=soup&category=mains&allergens=3,7&period=lunch
    // act: parseMenuUrl(params)
    // assert: { itemSlug: 'soup', category: 'category-mains', allergens: [3, 7], period: 'lunch' }
    expect.fail('not implemented')
  })

  it('ignores malformed values', () => {
    // arrange: ?item=<script>&allergens=a,-1,2&period=brunch
    // act: parseMenuUrl(params)
    // assert: { allergens: [2] } only
    expect.fail('not implemented')
  })
})

describe('menuUrlParams', () => {
  it('drops the params left at their default', () => {
    // arrange: ?lang=ar&period=lunch, state with no item, no category, allergens [], period 'all'
    // act: menuUrlParams(params, state)
    // assert: 'lang=ar' only
    expect.fail('not implemented')
  })

  it('round trips through parseMenuUrl', () => {
    // arrange: state { itemSlug: 'soup', category: 'category-mains', allergens: [3], period: 'dinner' }
    // act: parseMenuUrl(menuUrlParams(new URLSearchParams(), state))
    // assert: equals state
    expect.fail('not implemented')
  })
})
