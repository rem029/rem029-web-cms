import { describe, expect, it } from 'vitest'

import { RESERVED_PAGE_SLUGS } from '@/common/utils/reservedSlugs'

describe('reserved page slugs', () => {
  it.each(RESERVED_PAGE_SLUGS)('refuses page slug %s', async (slug) => {
    // arrange: a page in tenant a with slug `slug` (slugLock false so the slug is kept)
    // act: create as super user
    // assert: rejects; message names the slug and says to pick another
    void slug
    expect.fail('not implemented')
  })

  it('allows a slug that only starts with a reserved word', async () => {
    // arrange: a page with slug 'forms-and-guides-<unique>'
    // act: create
    // assert: saved
    expect.fail('not implemented')
  })
})
