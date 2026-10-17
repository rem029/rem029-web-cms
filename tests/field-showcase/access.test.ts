// The field showcase uses the standard access: super users, tenant admins, and members whose
// profile has a `field-showcase` row (test editor: CRUD, viewer: read), only in their tenant.
import { describe, expect, it } from 'vitest'

describe('field-showcase', () => {
  describe('super user', () => {
    it('creates, reads, updates and deletes in any tenant', () => {
      // arrange: super user, a title unique to this test
      // act: create in test-a and test-b, read both, update one, delete both
      // assert: every call succeeds
      expect.fail('not implemented')
    })
  })

  describe('tenant admin', () => {
    it('manages docs of its own tenant', () => {
      // arrange: tenantAdmin (test-a)
      // act: create, update, delete a doc in test-a
      // assert: every call succeeds
      expect.fail('not implemented')
    })

    it('sees none of another tenant', () => {
      // arrange: a doc in test-b (super user)
      // act: tenantAdmin finds by its title
      // assert: no docs
      expect.fail('not implemented')
    })
  })

  describe('member with a field-showcase row', () => {
    it('creates and edits docs in its tenant', () => {
      // arrange: member (editor in test-a)
      // act: create in test-a, update it
      // assert: both succeed
      expect.fail('not implemented')
    })

    it('reads but cannot create as a viewer', () => {
      // arrange: a doc in test-a (super user), viewer (test-a)
      // act: viewer reads it, then creates one
      // assert: read returns it; create rejects with 403
      expect.fail('not implemented')
    })

    it('sees none of another tenant', () => {
      // arrange: a doc in test-b (super user)
      // act: member finds by its title
      // assert: no docs
      expect.fail('not implemented')
    })

    it('keeps published docs private to its tenant', () => {
      // arrange: a published doc in test-a (super user)
      // act: otherTenant (test-b editor) finds by its title
      // assert: no docs
      expect.fail('not implemented')
    })

    it('refuses a parent from another tenant', () => {
      // arrange: a doc in test-b (super user)
      // act: member creates a doc in test-a with that doc as parent
      // assert: rejects with a validation error (400)
      expect.fail('not implemented')
    })

    it("joins only its tenant's children", () => {
      // arrange: a root in test-a; a child in test-a and one in test-b pointing at it
      //   (the test-b one written with overrideAccess, as a broken row would be)
      // act: member reads the root with its children join
      // assert: children holds only the test-a child
      expect.fail('not implemented')
    })
  })

  describe('member without a field-showcase row', () => {
    it('is denied every operation', () => {
      // arrange: a doc in test-a (super user), defaultProfile (test-a)
      // act: find, create, update, delete
      // assert: find returns no docs; create, update and delete reject with 403
      expect.fail('not implemented')
    })

    it('does not see it in the nav', () => {
      // arrange: defaultProfile, and member for contrast
      // act: hiddenResolver('field-showcase') for each
      // assert: hidden for defaultProfile, shown for member
      expect.fail('not implemented')
    })
  })

  describe('anonymous and disabled', () => {
    it('denies anonymous reads', () => {
      // arrange: a published doc in test-a (super user)
      // act: find without a user, overrideAccess false
      // assert: rejects with 403 or returns no docs (whichever Payload gives for `read: false`)
      expect.fail('not implemented')
    })

    it('denies a disabled user', () => {
      // arrange: a doc in test-a (super user), disabled (editor in test-a, is_disabled)
      // act: find and create
      // assert: find returns no docs; create rejects with 403
      expect.fail('not implemented')
    })
  })
})
