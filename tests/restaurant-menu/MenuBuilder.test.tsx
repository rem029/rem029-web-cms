// @vitest-environment jsdom
// The menu builder (rem0017 phase 2 step 2, `src/collections/Menus/components/MenuBuilder.tsx`):
// the Items tab of a menu. Outside edges mocked: `@payloadcms/ui` (useField for `items` and
// `tenant`, useDocumentInfo, useLocale) and the server actions module (`components/actions.ts`).
import { describe, expect, it } from 'vitest'

describe('MenuBuilder', () => {
  it('ticks the items already on the menu', () => {
    // arrange: items field = [a]; listBuilderItems action returns a, b
    // act: render <MenuBuilder />
    // assert: a's checkbox is checked, b's is not
    expect.fail('not implemented')
  })

  it('adds an item to the menu when ticked', () => {
    // arrange: items field = []; action returns a
    // act: click a's checkbox
    // assert: setValue called with [a]
    expect.fail('not implemented')
  })

  it('removes an item when unticked', () => {
    // arrange: items field = [a, b]
    // act: untick a
    // assert: setValue called with [b]
    expect.fail('not implemented')
  })

  it('adds every item of a category at once', () => {
    // arrange: items field = [a]; listItemsOfCategory returns a, b, c
    // act: click "Add all to this menu" on that category
    // assert: setValue called with [a, b, c] (no duplicate a)
    expect.fail('not implemented')
  })

  it('shows an empty state with a new item button', () => {
    // arrange: action returns no items
    // act: render
    // assert: 'Add your first item' and a 'New item' button are shown
    expect.fail('not implemented')
  })

  it('shows the saved price after an inline edit', () => {
    // arrange: action returns a with price 10; quickUpdateItem resolves ok with price 12
    // act: change a's price to 12 and leave the field
    // assert: the row shows 12 and 'Saved'
    expect.fail('not implemented')
  })

  it('shows the error when a quick edit fails', () => {
    // arrange: quickUpdateItem resolves { ok: false, error: 'You can only edit items of this business.' }
    // act: toggle a's stock
    // assert: the error text is shown and the toggle goes back
    expect.fail('not implemented')
  })
})
