'use client'

import { useEffect } from 'react'

import { useMenuStore } from '../_store/store'

/**
 * Writes the section at the top of the screen to the store's `category` while the guest scrolls
 * (`null` for the first section, the default),
 * so the category nav and the url follow (sdq's useMenuNav did this with per-category fetching
 * a whole-menu page doesn't need). IntersectionObserver on the section elements.
 */
export const useActiveSection = (ids: string[]): void => {
  const setCategory = useMenuStore((state) => state.setCategory)
  // a new array each render; the joined ids only change when the sections do
  const key = ids.join(' ')

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting)
        // the first section is the default: a plain visit keeps a clean url
        if (visible) setCategory(visible.target.id === first ? null : visible.target.id)
      },
      { rootMargin: '-20% 0px -70% 0px' },
    )
    const first = key.split(' ')[0]
    for (const id of key.split(' ')) {
      const element = id ? document.getElementById(id) : null
      if (element) observer.observe(element)
    }
    return () => observer.disconnect()
  }, [key, setCategory])
}
