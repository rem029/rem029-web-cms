'use client'

import type { TypedLocale } from 'payload'
import React from 'react'

// past about one phone screen of scrolling
const SCROLL_THRESHOLD = 400

/**
 * A round "Back to top" button at the bottom end corner (sdq `scroll-to-top-button.tsx`), shown
 * past SCROLL_THRESHOLD of window scrolling. Smooth scroll, instant with reduced motion.
 */
export const ScrollToTop: React.FC<{ locale: TypedLocale }> = (props) => {
  // 1. state visible; passive window scroll listener → visible = scrollY > SCROLL_THRESHOLD
  // 2. button fixed bottom-4 end-4, aria-label t.backToTop, hidden (tabIndex -1, opacity 0)
  //    until visible; click → window.scrollTo({ top: 0, behavior: reduced motion ? 'auto' :
  //    'smooth' })
  void props
  void SCROLL_THRESHOLD
  return null
}
