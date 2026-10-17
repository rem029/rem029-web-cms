'use client'

import type { TypedLocale } from 'payload'
import React from 'react'

import type { Menu as MenuDoc } from '@/payload-types'

import type { MenuSection } from '../_data/menuData'

export type MenuProps = {
  menuId: number
  sections: MenuSection[]
  currency: string
  locale: TypedLocale
  filters: MenuDoc['filters']
}

/**
 * The interactive part of `/menu/<slug>` (rem0017 phase 3 step 3, sdq `fnb-menu.tsx`): sticky
 * category nav with search and filter buttons, the sections with their item cards, the item view
 * and the search overlay. The whole menu comes from the server page (no fetching here except
 * search); state is local (filters, open item, search open), no store. A deep link
 * `?item=<slug>` opens that item.
 */
export const Menu: React.FC<MenuProps> = (props) => {
  // 1. t = menuStrings(locale); state: filters (NO_FILTERS), openItem (GuestMenuItem | null),
  //    searchOpen, filtersOpen
  // 2. shown = filterSections(sections, filters); ids = shown.map(sectionId)
  //    (`category-<slug>`, 'category-other' for null)
  // 3. useActiveSection(ids)
  // 4. on mount: ?item=<slug> → openItem = that item (searchParams via useSearchParams)
  // 5. openItem changes → history.replaceState ?item=<slug> / without it (no navigation)
  // 6. render:
  //    - sticky <CategoryNav sections={shown} active onPick={scroll + setActive} />, then
  //      a search button when filters.showSearch !== false, and a "Filters" button when
  //      showAllergens or showAvailability (aria-expanded, toggles the filter panel)
  //    - the panel: <FilterAllergens /> if showAllergens, <FilterAvailability /> if
  //      showAvailability
  //    - each section: <section id aria-labelledby> with h2 (category title ?? t.other) and a
  //      grid of <MenuItemCard onOpen={setOpenItem} />
  //    - nothing left after filtering → t.noResults
  //    - <ItemView /> when openItem, <SearchOverlay /> when searchOpen, <ScrollToTop />
  void props
  return <div />
}
