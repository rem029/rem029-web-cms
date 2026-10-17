'use client'

import { ArrowUp } from 'lucide-react'
import type { TypedLocale } from 'payload'
import React, { useEffect, useState } from 'react'

import { cn } from '@/utilities/ui'

import { menuStrings } from '../_i18n'

// past about one phone screen of scrolling
const SCROLL_THRESHOLD = 400

/**
 * A round "Back to top" button at the bottom end corner (sdq `scroll-to-top-button.tsx`), shown
 * past SCROLL_THRESHOLD of window scrolling. Smooth scroll, instant with reduced motion.
 */
export const ScrollToTop: React.FC<{ locale: TypedLocale }> = ({ locale }) => {
  const t = menuStrings(locale)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SCROLL_THRESHOLD)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const toTop = () => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
  }

  return (
    <button
      type="button"
      aria-label={t.backToTop}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      onClick={toTop}
      className={cn(
        'fixed bottom-4 end-4 z-30 rounded-full bg-menu-primary p-3 text-menu-primary-text shadow-lg',
        'transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-menu-text motion-reduce:transition-none',
        visible ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
    >
      <ArrowUp className="size-5" aria-hidden />
    </button>
  )
}
