// The guest menu page's data (rem0017 phase 3 step 1, `src/app/(frontend)/menu/_data/menuData.ts`):
// findMenuPage and searchMenuItems take the host's tenant id and fail closed without one;
// buildMenuSections is pure. TEST_MENU has a published menu with the same slug in test-a and test-b.
import { describe, expect, it } from 'vitest'

describe('menu data', () => {
  describe('findMenuPage', () => {
    it('returns the menu for its own tenant', async () => {
      // act: findMenuPage(payload, tenantA.id, TEST_MENU slug, { draft: false, locale: 'en' })
      // assert: the menu, with tenant test-a
      expect.fail('not implemented')
    })

    it("returns nothing for another tenant's slug", async () => {
      // arrange: a menu slug that exists only in test-b
      // act: findMenuPage with test-a's id
      // assert: null
      expect.fail('not implemented')
    })

    it('returns nothing without a tenant', async () => {
      // act: findMenuPage(payload, null, TEST_MENU slug, …)
      // assert: null
      expect.fail('not implemented')
    })

    it('returns nothing for a draft menu', async () => {
      // act: findMenuPage for the TEST_MENU draft menu of test-a, draft: false
      // assert: null
      expect.fail('not implemented')
    })

    it('returns the draft while previewing', async () => {
      // act: findMenuPage for the draft menu, draft: true
      // assert: the draft menu
      expect.fail('not implemented')
    })

    it('serves a hidden menu to the public site', async () => {
      // arrange: a published menu in test-a with isHidden ticked
      // act: findMenuPage for it, draft: false
      // assert: the menu (hidden documents only hide in the admin)
      expect.fail('not implemented')
    })
  })

  describe('buildMenuSections', () => {
    it('groups items by category in sort order', () => {
      // arrange: items in categories with sortOrder 2 and 1
      // act: buildMenuSections(items, categories)
      // assert: the sortOrder 1 section comes first
      expect.fail('not implemented')
    })

    it('keeps the menu order inside a category', () => {
      // arrange: items c, a, b of one category, in that order
      // act: buildMenuSections
      // assert: that section's items are c, a, b
      expect.fail('not implemented')
    })

    it('puts uncategorized items last', () => {
      // arrange: one categorized and one uncategorized item
      // act: buildMenuSections
      // assert: the last section has no category (shown as "Other")
      expect.fail('not implemented')
    })

    it('leaves out inactive items', () => {
      // arrange: an item with isActive false
      // act: buildMenuSections
      // assert: the item is in no section; an empty category gets no section
      expect.fail('not implemented')
    })

    it('keeps out of stock items', () => {
      // arrange: an item with inStock false
      // act: buildMenuSections
      // assert: the item is in its section with inStock false
      expect.fail('not implemented')
    })
  })

  describe('searchMenuItems', () => {
    it('finds only items on the menu', async () => {
      // arrange: a test-a item on the menu and one that isn't, both matching the query
      // act: searchMenuItems(payload, tenantA.id, menuId, query, 'en')
      // assert: only the item on the menu
      expect.fail('not implemented')
    })

    it('matches arabic titles in arabic', async () => {
      // arrange: a TEST_MENU item with an arabic title
      // act: searchMenuItems with part of that title, locale 'ar'
      // assert: the item is found
      expect.fail('not implemented')
    })

    it('returns nothing without a tenant', async () => {
      // act: searchMenuItems(payload, null, menuId, query, 'en')
      // assert: []
      expect.fail('not implemented')
    })
  })
})
