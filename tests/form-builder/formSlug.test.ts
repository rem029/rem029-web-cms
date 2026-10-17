import { describe, expect, it } from 'vitest'

describe('form slug', () => {
  it('fills the slug from the title', async () => {
    // arrange: a form titled 'Contact Us <unique>' without a slug
    // act: create it
    // assert: slug is 'contact-us-<unique>'
    expect.fail('not implemented')
  })

  it('refuses a duplicate slug in the same tenant', async () => {
    // arrange: a form with slug s in tenant a
    // act: create a second form with slug s in tenant a
    // assert: rejects; message says the slug already exists in this business
    expect.fail('not implemented')
  })

  it('allows the same slug in another tenant', async () => {
    // arrange: a form with slug s in tenant a
    // act: create a form with slug s in tenant b
    // assert: saved, slug s
    expect.fail('not implemented')
  })
})
