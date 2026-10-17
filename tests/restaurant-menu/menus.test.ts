// Menus (rem0017 phase 2 step 1): a menu is the page at /menu/<slug>; it picks items from its
// tenant's catalog and has drafts and hidden documents like Pages. Local API with overrideAccess:
// false and seeded users; TEST_MENU fixtures (items and menus in test-a and test-b).
import { describe, expect, it } from 'vitest'

describe('menus', () => {
  describe('access', () => {
    it('lets an editor create a menu in their tenant', async () => {
      // arrange: the editor of test-a, a unique title
      // act: create a draft menu in test-a
      // assert: the menu exists in test-a
      expect.fail('not implemented')
    })

    it('hides menus of other tenants from members', async () => {
      // arrange: the editor of test-b only; TEST_MENU menus in test-a and test-b
      // act: payload.find as that user (draft: true)
      // assert: every returned menu belongs to test-b
      expect.fail('not implemented')
    })

    it('denies menus to a viewer for writes', async () => {
      // arrange: the viewer of test-a
      // act: create a menu in test-a
      // assert: rejects with status 403
      expect.fail('not implemented')
    })

    it('keeps draft menus from anonymous readers', async () => {
      // arrange: the TEST_MENU draft menu of test-a
      // act: payload.find with no user, overrideAccess: false
      // assert: the draft menu is not returned, the published one is
      expect.fail('not implemented')
    })

    it('hides a hidden menu from other members', async () => {
      // arrange: a menu created hidden by the editor of test-a (isHidden, no "Visible to")
      // act: payload.find as TEST_USERS.multiTenant (another editor of test-a)
      // assert: the hidden menu is not returned
      expect.fail('not implemented')
    })
  })

  describe('slug', () => {
    it('fills the slug from the title', async () => {
      // act: create a menu titled 'Late Breakfast <id>' without a slug
      // assert: slug is the kebab-case title
      expect.fail('not implemented')
    })

    it('refuses a duplicate slug in one tenant', async () => {
      // arrange: a menu with a unique slug in test-a
      // act: create a second menu with that slug in test-a
      // assert: rejects with a plain-words slug message
      expect.fail('not implemented')
    })

    it('allows the same slug in another tenant', async () => {
      // arrange: a menu with a unique slug in test-a
      // act: create a menu with that slug in test-b as test-b's editor
      // assert: both exist
      expect.fail('not implemented')
    })
  })

  describe('items', () => {
    it('keeps the order of picked items', async () => {
      // arrange: three TEST_MENU items of test-a in the order c, a, b
      // act: create the menu with items [c, a, b], read it back
      // assert: items are [c, a, b]
      expect.fail('not implemented')
    })

    it('refuses an item from another tenant', async () => {
      // arrange: a TEST_MENU item of test-b
      // act: create a published menu in test-a with that item (as the super user)
      // assert: rejects with a "belongs to another business" message
      expect.fail('not implemented')
    })

    it('refuses an item from another tenant on a draft save', async () => {
      // arrange: a draft menu in test-a, a TEST_MENU item of test-b
      // act: update the menu with draft: true and that item (draft saves skip validate)
      // assert: rejects with a "belongs to another business" message
      expect.fail('not implemented')
    })
  })

  describe('page fields', () => {
    it('starts with search on and other filters off', async () => {
      // act: create a menu with only a title
      // assert: filters = { showSearch: true, showAllergens: false, showAvailability: false }
      expect.fail('not implemented')
    })
  })
})
