// @vitest-environment jsdom
// A menu on the /menu list (rem0017 phase 3 step 2, `src/app/(frontend)/menu/_components/MenuCard.tsx`).
import { describe, expect, it } from 'vitest'

describe('MenuCard', () => {
  it('links to the menu page', () => {
    // arrange: a menu with slug 'dinner'
    // act: render <MenuCard menu={…} />
    // assert: the link's href is '/menu/dinner'
    expect.fail('not implemented')
  })

  it('shows the intro heading', () => {
    // arrange: a menu with intro.heading 'Fresh every day'
    // act: render
    // assert: the heading text is shown
    expect.fail('not implemented')
  })

  it('renders right-to-left in arabic', () => {
    // arrange: a wrapper with dir="rtl", arabic title
    // act: render
    // assert: the arabic title is shown and the card uses logical (start/end) spacing, not left/right
    expect.fail('not implemented')
  })
})
