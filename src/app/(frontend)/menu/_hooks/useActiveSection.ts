'use client'

import { useEffect } from 'react'

/**
 * Writes the section at the top of the screen to the store's `category` while the guest scrolls,
 * so the category nav and the url follow (sdq's useMenuNav did this with per-category fetching
 * a whole-menu page doesn't need). IntersectionObserver on the section elements.
 */
export const useActiveSection = (ids: string[]): void => {
  // 1. setCategory from useMenuStore
  // 2. effect: IntersectionObserver (rootMargin '-20% 0px -70% 0px') on each
  //    document.getElementById(id); the first intersecting entry → setCategory(entry.target.id)
  // 3. disconnect on cleanup; no IntersectionObserver (old browser, jsdom) → do nothing
  useEffect(() => {}, [ids])
}
