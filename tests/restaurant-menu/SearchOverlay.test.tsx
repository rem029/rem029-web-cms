// @vitest-environment jsdom
// Search on the guest menu (rem0017 phase 3 step 3, `src/app/(frontend)/menu/_components/
// SearchOverlay.tsx`). Outside edge mocked: searchMenuItemsAction.
import { describe, expect, it } from 'vitest'

describe('SearchOverlay', () => {
  it('shows matching items after typing', () => {
    // arrange: searchMenuItemsAction resolves [Soup]
    // act: open the overlay, type 'sou', wait for the debounce
    // assert: Soup is listed
    expect.fail('not implemented')
  })

  it('shows a no results message', () => {
    // arrange: searchMenuItemsAction resolves []
    // act: type 'zzz'
    // assert: 'No results' is shown
    expect.fail('not implemented')
  })
})
