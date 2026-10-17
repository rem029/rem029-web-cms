// Menu categories (rem0017 phase 1 step 1): slug from the title, unique per tenant, sorted by
// `sortOrder`. Created as the editor of test-a / test-b with overrideAccess: false.
import { describe, expect, it } from 'vitest'

describe('menu categories', () => {
  it('fills the slug from the title', async () => {
    // arrange: a unique title like 'Hot Drinks <id>'
    // act: create the category in test-a as the editor, without a slug
    // assert: slug is the kebab-case title
    expect.fail('not implemented')
  })

  it('refuses a duplicate slug in one tenant', async () => {
    // arrange: a category with a unique slug in test-a
    // act: create a second category with the same slug in test-a
    // assert: rejects with a plain-words slug message (rejectionText)
    expect.fail('not implemented')
  })

  it('allows the same slug in another tenant', async () => {
    // arrange: a category with a unique slug in test-a
    // act: create a category with that slug in test-b as test-b's editor
    // assert: both exist
    expect.fail('not implemented')
  })

  it('lists categories in sort order', async () => {
    // arrange: three categories in test-a with sortOrder 2, 0, 1 and a shared unique prefix
    // act: payload.find without a sort, filtered to the prefix
    // assert: titles come back in sortOrder 0, 1, 2
    expect.fail('not implemented')
  })
})
