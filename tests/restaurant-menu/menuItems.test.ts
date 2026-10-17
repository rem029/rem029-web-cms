// Menu items (rem0017 phase 1 step 1): price, category, slug per tenant, options (modifier
// groups), defaults, the same-tenant check on relationships, and who sees inactive items.
// Created as the editor of test-a with overrideAccess: false; TEST_MENU fixtures for lookups.
import { describe, expect, it } from 'vitest'

describe('menu items', () => {
  describe('create', () => {
    it('creates an item with price and category', async () => {
      // arrange: a TEST_MENU category of test-a
      // act: create an item with a title, price 12.5 and that category
      // assert: price is 12.5 and category is the test-a category
      expect.fail('not implemented')
    })

    it('fills the slug from the title', async () => {
      // arrange: a unique title
      // act: create the item without a slug
      // assert: slug is the kebab-case title
      expect.fail('not implemented')
    })

    it('defaults to in stock, shown, all day', async () => {
      // arrange: only a title and a price
      // act: create the item
      // assert: inStock true, isActive true, availability ['all_day']
      expect.fail('not implemented')
    })

    it('saves modifier groups with options', async () => {
      // arrange: one radio group 'Size' (required) with options Small, Large
      // act: create the item with that group
      // assert: the group and both options come back in order
      expect.fail('not implemented')
    })
  })

  describe('validation', () => {
    it('refuses a duplicate slug in one tenant', async () => {
      // arrange: an item with a unique slug in test-a
      // act: create a second item with that slug in test-a
      // assert: rejects with a plain-words slug message
      expect.fail('not implemented')
    })

    it('allows the same slug in another tenant', async () => {
      // arrange: an item with a unique slug in test-a
      // act: create an item with that slug in test-b as test-b's editor
      // assert: both exist
      expect.fail('not implemented')
    })

    it('refuses a negative price', async () => {
      // act: create an item with price -1
      // assert: rejects with a price message
      expect.fail('not implemented')
    })

    it('refuses a category from another tenant', async () => {
      // arrange: a TEST_MENU category of test-b
      // act: create an item in test-a with that category (as the super user, so access isn't what stops it)
      // assert: rejects with a "belongs to another business" message
      expect.fail('not implemented')
    })

    it('refuses an allergen from another tenant', async () => {
      // arrange: a TEST_MENU allergen of test-b
      // act: create an item in test-a with that allergen (as the super user)
      // assert: rejects with a "belongs to another business" message
      expect.fail('not implemented')
    })

    it('refuses a modifier group without options', async () => {
      // act: create an item with a group 'Milk' and no options
      // assert: rejects with an options message
      expect.fail('not implemented')
    })
  })

  describe('inactive items', () => {
    it('hides inactive items from anonymous readers', async () => {
      // arrange: the TEST_MENU inactive item of test-a
      // act: payload.find with overrideAccess: false and no user, tenant = test-a
      // assert: the inactive item is not returned, an active one is
      expect.fail('not implemented')
    })

    it('shows inactive items to editors', async () => {
      // arrange: the TEST_MENU inactive item of test-a
      // act: payload.find as the editor of test-a
      // assert: the inactive item is returned
      expect.fail('not implemented')
    })
  })
})
