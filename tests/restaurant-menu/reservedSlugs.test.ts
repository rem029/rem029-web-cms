// Reserved page slugs (rem0017 phase 2 step 1, `src/common/utils/reservedSlugs.ts`): `/menu` is
// the menus route, so no page may take the slug `menu`. Other collections are unaffected.
import { describe, expect, it } from 'vitest'

describe('reserved slugs', () => {
  it('refuses a page with the slug menu', async () => {
    // arrange: the editor of test-a
    // act: create a page in test-a with slug 'menu'
    // assert: rejects with a message saying the address is used by the menus
    expect.fail('not implemented')
  })

  it('allows a menu item or category with the slug menu', async () => {
    // act: create a category and an item titled 'Menu' in test-a (slugs 'menu' / unique per tenant)
    // assert: both are created
    expect.fail('not implemented')
  })
})
