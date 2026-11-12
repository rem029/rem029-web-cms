// The staff board links in the admin nav (rem0018 phase 4 step 2b,
// src/plugins/orderBoardNavLinks.ts): placed by a plugin after the multi-tenant plugin, so they sit
// under the business selector they depend on.
import { describe, expect, it } from 'vitest'

import config from '@payload-config'
import { ORDER_BOARD_NAV_LINKS_PATH } from '@/plugins/orderBoardNavLinks'

describe('orderBoardNavLinks', () => {
  it('puts the board links right after the business selector', async () => {
    // arrange: the built config
    const links = (await config).admin.components?.beforeNavLinks ?? []

    // act: find the business selector and the board links
    const paths = links.map((link) => (typeof link === 'string' ? link : link ? link.path : ''))
    const selector = paths.findIndex((path) => path.includes('TenantSelector'))

    // assert: the board links come right after the selector
    expect(selector).toBeGreaterThanOrEqual(0)
    expect(paths[selector + 1]).toBe(ORDER_BOARD_NAV_LINKS_PATH)
  })
})
