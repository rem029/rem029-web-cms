// The menu builder's server functions (rem0017 phase 2 step 2, `src/collections/Menus/utils/
// builder.ts`): what the Items tab lists and saves. Each takes (payload, user, args) and runs with
// overrideAccess: false for that user; the tenant comes from the menu. Seeded users, TEST_MENU.
import { describe, expect, it } from 'vitest'

describe('menu builder', () => {
  describe('listing', () => {
    it('lists the tenant items with category and price', async () => {
      // arrange: the editor of test-a, the TEST_MENU menu of test-a
      // act: listBuilderItems(payload, editor, { menuId })
      // assert: rows have title, category title and price of test-a's items
      expect.fail('not implemented')
    })

    it('leaves out items of other tenants', async () => {
      // arrange: TEST_USERS.multiTenant (editor in test-a and test-b), the test-a menu
      // act: listBuilderItems for the test-a menu
      // assert: every row is a test-a item
      expect.fail('not implemented')
    })

    it('filters items by category', async () => {
      // act: listBuilderItems with { categoryId } of a TEST_MENU category
      // assert: every row has that category
      expect.fail('not implemented')
    })

    it('searches items by title', async () => {
      // act: listBuilderItems with { search: part of a TEST_MENU item title }
      // assert: that item is in the rows, an unrelated one is not
      expect.fail('not implemented')
    })

    it('lists every active item of a category', async () => {
      // act: listItemsOfCategory(payload, editor, { menuId, categoryId })
      // assert: the category's active items, without the inactive one
      expect.fail('not implemented')
    })
  })

  describe('saving', () => {
    it('updates price and stock of an item', async () => {
      // arrange: an item created in test-a for this test
      // act: quickUpdateItem(payload, editor, { menuId, itemId, price: 9, inStock: false })
      // assert: ok, and the item reads back price 9, inStock false
      expect.fail('not implemented')
    })

    it('creates an item in the menu tenant', async () => {
      // act: saveItem(payload, editor, { menuId, data: { title, price } })
      // assert: ok, the new item's tenant is test-a
      expect.fail('not implemented')
    })

    it('creates a category in the menu tenant', async () => {
      // act: saveCategory(payload, editor, { menuId, data: { title } })
      // assert: ok, the new category's tenant is test-a
      expect.fail('not implemented')
    })

    it('reorders categories', async () => {
      // arrange: three categories in test-a created for this test
      // act: reorderCategories(payload, editor, { menuId, ids: [c, a, b] })
      // assert: their sortOrder follows c, a, b
      expect.fail('not implemented')
    })
  })

  describe('refusals', () => {
    it('refuses an item of another tenant', async () => {
      // arrange: TEST_USERS.multiTenant, the test-a menu, a TEST_MENU item of test-b
      // act: quickUpdateItem for that item through the test-a menu
      // assert: { ok: false } with a plain-words error, the item is unchanged
      expect.fail('not implemented')
    })

    it('refuses a viewer without update on items', async () => {
      // arrange: the viewer of test-a
      // act: quickUpdateItem on a test-a item
      // assert: { ok: false } with a plain-words error
      expect.fail('not implemented')
    })

    it('refuses a disabled user', async () => {
      // arrange: the disabled editor of test-a
      // act: listBuilderItems for the test-a menu
      // assert: { ok: false }
      expect.fail('not implemented')
    })
  })
})
