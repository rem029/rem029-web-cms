'use client'

import type { TypedLocale } from 'payload'
import React from 'react'

import type { GuestMenuItem } from '../_data/menuData'

export type SearchOverlayProps = {
  menuId: number
  currency: string
  locale: TypedLocale
  onOpenItem: (item: GuestMenuItem) => void
  onClose: () => void
}

/**
 * Full screen search over the menu (sdq `search-overlay.tsx`): a search box focused on open,
 * results from `searchMenuItemsAction` 300ms after the guest stops typing, shown as item cards.
 * Skeleton cards while searching, "No results", or the search error in the guest's language.
 * Answers to an older query are dropped. Escape or the close button closes it.
 */
export const SearchOverlay: React.FC<SearchOverlayProps> = (props) => {
  // 1. state query, results (GuestMenuItem[] | null), loading, error
  // 2. debounced = useDebounce(query, 300)
  // 3. effect on debounced: '' → results null; else loading, call
  //    searchMenuItemsAction({ menuId, query: debounced, locale }); ignore if a newer query
  //    started (a request counter ref); ok → results, else error = t[result.error] ?? t.searchFailed
  // 4. render: role="dialog" aria-modal, <input type="search" aria-label=t.search autoFocus>,
  //    close button, then skeletons / error / t.noResults / MenuItemCard list (onOpen →
  //    onOpenItem(item), onClose())
  // 5. Escape keydown → onClose
  void props
  return <div role="dialog" />
}
