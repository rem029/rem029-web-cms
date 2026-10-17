'use client'

import { useEffect } from 'react'

import { useMenuStore } from '../_store/store'

/**
 * Store → url: whenever the shareable state changes, `history.replaceState` writes it with
 * `menuUrlParams` (Next 15 keeps useSearchParams in sync; no navigation, so the server page
 * isn't fetched again and the back button isn't filled with filter clicks). Url → store happens
 * once, as the provider's `initial`. On load with `?item=` or `?category=`, scrolls that section
 * into view.
 */
export const useMenuUrl = (): void => {
  // 1. read allergens, period, category, itemSlug with useMenuStore
  // 2. effect on them: next = menuUrlParams(new URLSearchParams(location.search), state);
  //    unchanged → skip; else history.replaceState(null, '', `${pathname}?${next}` or pathname)
  // 3. effect once: initial category → document.getElementById(category)?.scrollIntoView()
  const category = useMenuStore((state) => state.category)
  useEffect(() => {}, [category])
}
