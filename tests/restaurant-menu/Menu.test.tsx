// @vitest-environment jsdom
// The guest menu (rem0017 phase 3 step 3, `src/app/(frontend)/menu/_components/Menu.tsx`): sections
// from buildMenuSections, category nav, filters as the menu enables them, out-of-stock state.
// Outside edges mocked: the frontend server actions module, IntersectionObserver / scrollIntoView.
import { describe, expect, it } from 'vitest'

describe('Menu', () => {
  it('lists items under their category', () => {
    // arrange: sections Starters [Soup], Mains [Steak]
    // act: render <Menu … />
    // assert: Soup is inside the Starters section, Steak inside Mains
    expect.fail('not implemented')
  })

  it('jumps to a category from the nav', () => {
    // arrange: two sections
    // act: click 'Mains' in the category nav
    // assert: the Mains section was scrolled into view and the nav marks it current
    expect.fail('not implemented')
  })

  it('filters items by allergen', () => {
    // arrange: filters.showAllergens on; Soup has 'Gluten', Steak none
    // act: open Filters, pick 'Gluten' (show only items containing it)
    // assert: Soup is shown, Steak is hidden
    expect.fail('not implemented')
  })

  it('filters items by availability', () => {
    // arrange: filters.showAvailability on; Soup lunch, Steak dinner
    // act: pick 'Dinner'
    // assert: Steak is shown, Soup is hidden
    expect.fail('not implemented')
  })

  it('hides the filters the menu turned off', () => {
    // arrange: filters { showSearch: false, showAllergens: false, showAvailability: false }
    // act: render
    // assert: no search button and no filter button
    expect.fail('not implemented')
  })

  it('marks out of stock items', () => {
    // arrange: Steak with inStock false
    // act: render
    // assert: Steak shows 'Out of stock'
    expect.fail('not implemented')
  })

  it('opens the item from a shared link', () => {
    // arrange: initial { itemSlug: 'soup' } (what parseMenuUrl reads from ?item=soup)
    // act: render
    // assert: the item view shows Soup
    expect.fail('not implemented')
  })

  it('writes the picked filters to the url', () => {
    // arrange: filters.showAvailability on; window.history.replaceState spied
    // act: open Filters, pick 'Dinner'
    // assert: the last replaceState url has period=dinner
    expect.fail('not implemented')
  })

  it('renders right-to-left in arabic', () => {
    // arrange: locale 'ar', arabic titles
    // act: render inside dir="rtl"
    // assert: arabic labels ('نفد' / i18n strings) and the arabic category titles are shown
    expect.fail('not implemented')
  })
})
