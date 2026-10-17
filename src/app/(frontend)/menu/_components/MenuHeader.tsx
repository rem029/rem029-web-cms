import React from 'react'

import type { Media } from '@/payload-types'

export type MenuHeaderProps = {
  /** the menu's header title (else its title) on a menu page, the site name on `/menu` */
  title: string
  /** the menu's header logo, else the Settings logo (populated) */
  logo: Media | null
  /** where the logo and title link to: `/menu` from a menu page, `/` from the list */
  homeHref: string
  showLanguageSwitch: boolean
}

/**
 * The menu pages' own header (rem0017 phase 3), in place of the site Header: logo, title and the
 * EN / عربي switch (the existing `LocaleSwitch`, `?lang=`). Theme classes only, logical spacing
 * for RTL. Server component; the category nav (step 3) sticks below it.
 */
export const MenuHeader: React.FC<MenuHeaderProps> = (props) => {
  // <header className="border-b border-border bg-background">
  //   <div className="container flex items-center justify-between gap-4 py-3">
  //     <Link href={homeHref} className="flex items-center gap-3">{logo && <img … h-10 />}
  //       <span className="text-lg font-semibold">{title}</span></Link>
  //     {showLanguageSwitch && <LocaleSwitch location="header" />}
  //   </div>
  // </header>
  void props
  return <header />
}
