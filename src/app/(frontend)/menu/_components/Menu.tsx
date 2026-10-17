'use client'

import type { TypedLocale } from 'payload'
import React from 'react'

import type { Menu as MenuDoc } from '@/payload-types'

import type { MenuSection } from '../_data/menuData'
import type { MenuState } from '../_store/store'

export type MenuProps = {
  menuId: number
  sections: MenuSection[]
  currency: string
  locale: TypedLocale
  filters: MenuDoc['filters']
  /** what the url asks for (`parseMenuUrl` on the server), so a shared link renders as sent */
  initial?: Partial<MenuState>
}

/**
 * The interactive part of `/menu/<slug>` (rem0017 phase 3 step 3, sdq `fnb-menu.tsx`): sticky
 * category nav with search and filter buttons, the sections with their item cards, the item view
 * and the search overlay. The whole menu comes from the server page (no fetching here except
 * search); the state lives in a zustand store (one per menu, `MenuStoreProvider`), mirrored in the
 * url by `useMenuUrl`, so `?item=`, `?category=`, `?allergens=` and `?period=` links are
 * shareable.
 */
export const Menu: React.FC<MenuProps> = (props) => {
  // <MenuStoreProvider initial={initial}><MenuBody {...props} /></MenuStoreProvider>
  void props
  return <div />
}

// inside the provider, so it can use the store
const MenuBody: React.FC<Omit<MenuProps, 'initial'>> = (props) => {
  // 1. t = menuStrings(locale); allergens, period, itemSlug, searchOpen, filtersOpen + setters
  //    from useMenuStore
  // 2. shown = filterSections(sections, { allergens, period }); ids = shown.map(sectionId)
  // 3. useActiveSection(ids); useMenuUrl()
  // 4. openItem = the item in sections with slug itemSlug (unknown slug → none, and the url
  //    param is dropped by useMenuUrl once openItem(null) runs)
  // 5. render:
  //    - sticky bar: <CategoryNav sections={shown} />, a search button when
  //      filters.showSearch !== false, a "Filters" button (aria-expanded) when showAllergens or
  //      showAvailability
  //    - the panel when filtersOpen: <FilterAllergens allergens={allergensOf(sections)} /> if
  //      showAllergens, <FilterAvailability /> if showAvailability
  //    - each section: <section id aria-labelledby> h2 (category title ?? t.other) and a grid of
  //      <MenuItemCard onOpen={(item) => openItem(item.slug)} />
  //    - nothing left after filtering → t.noResults
  //    - <ItemView onClose={() => openItem(null)} /> when openItem, <SearchOverlay /> when
  //      searchOpen, <ScrollToTop />
  void props
  return <div />
}

void MenuBody
