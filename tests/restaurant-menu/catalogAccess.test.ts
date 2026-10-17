// Who may read and write the menu catalog (rem0017 phase 1 step 1): categories, allergens, tags
// and items are tenant-scoped and read their access from the user's profile on that tenant's row.
// Uses the seeded editor/viewer profiles (extended with the catalog slugs) and TEST_MENU fixtures.
import { describe, expect, it } from 'vitest'

const CATALOG = ['menu-categories', 'menu-allergens', 'menu-tags', 'menu-items'] as const
const LOOKUPS = ['menu-categories', 'menu-allergens', 'menu-tags'] as const

describe('menu catalog access', () => {
  describe('members', () => {
    it.each(CATALOG)('lets an editor create %s in their tenant', async (_slug) => {
      // arrange: the editor of test-a (TEST_USERS.member), a unique title
      // act: payload.create in test-a with overrideAccess: false and the member
      // assert: the doc exists and its tenant is test-a
      expect.fail('not implemented')
    })

    it.each(CATALOG)('hides %s of other tenants from members', async (_slug) => {
      // arrange: the editor of test-b only (TEST_USERS.otherTenant); TEST_MENU docs in test-a and test-b
      // act: payload.find with overrideAccess: false and that user
      // assert: every returned doc belongs to test-b
      expect.fail('not implemented')
    })

    it.each(CATALOG)('denies %s writes to a viewer', async (_slug) => {
      // arrange: the viewer of test-a (TEST_USERS.viewer)
      // act: payload.create in test-a with overrideAccess: false
      // assert: rejects with status 403
      expect.fail('not implemented')
    })

    it.each(CATALOG)('denies %s to a disabled user', async (_slug) => {
      // arrange: the disabled editor of test-a (TEST_USERS.disabled)
      // act: payload.find with overrideAccess: false
      // assert: rejects with status 403
      expect.fail('not implemented')
    })

    it.each(CATALOG)('refuses %s writes in an inactive tenant', async (_slug) => {
      // arrange: the editor of test-inactive (TEST_USERS.inactiveMember)
      // act: payload.create in test-inactive with overrideAccess: false
      // assert: rejects with status 403
      expect.fail('not implemented')
    })
  })

  describe('anonymous', () => {
    it.each(LOOKUPS)('reads %s anonymously', async (_slug) => {
      // arrange: no user
      // act: payload.find with overrideAccess: false and no user, where tenant = test-a
      // assert: returns test-a's seeded docs
      expect.fail('not implemented')
    })
  })
})
