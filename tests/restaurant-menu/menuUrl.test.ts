// The menu's shareable url state (rem0017 phase 3 step 3, `src/app/(frontend)/menu/_data/
// menuUrl.ts`): pure, no db.
import { describe, expect, it } from 'vitest'

import { menuUrlParams, parseMenuUrl, type MenuUrlState } from '@/app/(frontend)/menu/_data/menuUrl'

const DEFAULTS: MenuUrlState = { itemSlug: null, category: null, allergens: [], period: 'all' }

describe('parseMenuUrl', () => {
  it('reads the item, category, allergens and period', () => {
    // arrange
    const params = new URLSearchParams('item=soup&category=mains&allergens=3,7&period=lunch')

    // act
    const state = parseMenuUrl(params)

    // assert
    expect(state).toEqual({
      itemSlug: 'soup',
      category: 'category-mains',
      allergens: [3, 7],
      period: 'lunch',
    })
  })

  it('ignores malformed values', () => {
    // arrange
    const params = new URLSearchParams('item=<script>&allergens=a,-1,2&period=brunch')

    // act
    const state = parseMenuUrl(params)

    // assert
    expect(state).toEqual({ allergens: [2] })
  })
})

describe('menuUrlParams', () => {
  it('drops the params left at their default', () => {
    // arrange
    const params = new URLSearchParams('lang=ar&period=lunch')

    // act
    const next = menuUrlParams(params, DEFAULTS)

    // assert
    expect(next.toString()).toBe('lang=ar')
  })

  it('round trips through parseMenuUrl', () => {
    // arrange
    const state: MenuUrlState = {
      itemSlug: 'soup',
      category: 'category-mains',
      allergens: [3],
      period: 'dinner',
    }

    // act
    const back = parseMenuUrl(menuUrlParams(new URLSearchParams(), state))

    // assert
    expect(back).toEqual(state)
  })
})
