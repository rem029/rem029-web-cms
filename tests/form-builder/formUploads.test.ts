import { describe, expect, it } from 'vitest'

describe('form uploads', () => {
  describe('reading', () => {
    it('denies anonymous reads', async () => {
      // arrange: an upload in tenant a (created with overrideAccess, as the submit action does)
      // act: find form-uploads by its id without a user, overrideAccess false
      // assert: rejects with 403 (or no docs, whichever Payload returns for read access false)
      expect.fail('not implemented')
    })

    it('lets a member with read see their tenant uploads', async () => {
      // arrange: an upload in tenant a; member (editor in test-a, read on form-uploads)
      // act: find by id as member, overrideAccess false
      // assert: one doc, with its form and field_name
      expect.fail('not implemented')
    })

    it('hides other tenants uploads', async () => {
      // arrange: an upload in tenant b; member of tenant a
      // act: find by id as member, overrideAccess false
      // assert: no docs
      expect.fail('not implemented')
    })
  })

  describe('writing', () => {
    it('refuses create through the api', async () => {
      // arrange: member of tenant a, a png file, a form in tenant a
      // act: create as member, overrideAccess false
      // assert: rejects with 403
      expect.fail('not implemented')
    })

    it('refuses a file type outside images and pdf', async () => {
      // arrange: a text/plain file
      // act: create with overrideAccess true (as the submit action does)
      // assert: rejects; message names the file type
      expect.fail('not implemented')
    })

    it('refuses a file over 10 MB', async () => {
      // arrange: a png buffer of 10 MB + 1 byte
      // act: create with overrideAccess true
      // assert: rejects with 'Files can be up to 10 MB.'
      expect.fail('not implemented')
    })

    it('stores an allowed file under the form tenant', async () => {
      // arrange: a png, a form in tenant a
      // act: create with overrideAccess true, tenant a
      // assert: saved with tenant a, form, field_name, mimeType image/png
      expect.fail('not implemented')
    })
  })
})
