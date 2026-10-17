// Live preview of a menu (rem0017 phase 2 step 1): previewURL() for `menus` points at the menu's
// tenant host and /menu/<slug>, signed like the other previewable collections.
import { describe, expect, it } from 'vitest'

describe('menu preview', () => {
  it('builds the preview url on the tenant host', async () => {
    // arrange: the TEST_MENU published menu of test-a, the editor of test-a
    // act: previewURL({ collection: 'menus', doc, req })
    // assert: the url's host is test-a's host and its token verifies for test-a (verifyPreview)
    expect.fail('not implemented')
  })

  it('points the preview at /menu/<slug>', async () => {
    // arrange: the same menu
    // act: previewURL for it
    // assert: the signed path is `/menu/<menu slug>`
    expect.fail('not implemented')
  })
})
