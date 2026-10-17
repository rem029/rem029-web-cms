'use client'

import { useEffect, useRef } from 'react'

import { menuUrlParams } from '../_data/menuUrl'
import { useMenuStore } from '../_store/store'

/**
 * Store → url: whenever the shareable state changes, `history.replaceState` writes it with
 * `menuUrlParams` (Next 15 keeps useSearchParams in sync; no navigation, so the server page
 * isn't fetched again and the back button isn't filled with filter clicks). Url → store happens
 * once, as the provider's `initial`. On load with `?item=` or `?category=`, scrolls that section
 * into view.
 */
export const useMenuUrl = (): void => {
  const allergens = useMenuStore((state) => state.allergens)
  const period = useMenuStore((state) => state.period)
  const category = useMenuStore((state) => state.category)
  const itemSlug = useMenuStore((state) => state.itemSlug)
  const initialCategory = useRef(category)

  useEffect(() => {
    const current = new URLSearchParams(window.location.search)
    const next = menuUrlParams(current, { allergens, period, category, itemSlug })
    if (next.toString() === current.toString()) return
    const query = next.toString()
    window.history.replaceState(
      window.history.state,
      '',
      query ? `${window.location.pathname}?${query}` : window.location.pathname,
    )
  }, [allergens, period, category, itemSlug])

  useEffect(() => {
    if (initialCategory.current) {
      document.getElementById(initialCategory.current)?.scrollIntoView()
    }
  }, [])
}
