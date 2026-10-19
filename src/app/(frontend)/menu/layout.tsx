import React from 'react'

import './menu.css'

/**
 * The menu pages (rem0017 phase 3) sit outside the `(site)` route group, so they get no site
 * Header or Footer: each page renders its own MenuHeader and MenuFooter inside its `menu-theme`
 * wrapper, where the menu's own colours apply. This layout only loads the menu colour tokens.
 */
export default function MenuLayout({ children }: { children: React.ReactNode }) {
  return children
}
