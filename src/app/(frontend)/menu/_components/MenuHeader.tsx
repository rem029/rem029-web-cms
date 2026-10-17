import Link from 'next/link'
import React from 'react'

import type { TypedLocale } from 'payload'

import type { Media } from '@/payload-types'

import { touchTarget } from './chip'
import { LanguageSwitch } from './LanguageSwitch'

export type MenuHeaderProps = {
  /** the menu's header title (else its title) on a menu page, the site name on `/menu` */
  title: string
  /** the menu's header logo, else the Settings logo (populated) */
  logo: Media | null
  /** where the logo and title link to: `/menu` from a menu page, `/` from the list */
  homeHref: string
  showLanguageSwitch: boolean
  /** the visitor's locale, marked on the switch */
  locale?: TypedLocale
}

/**
 * The menu pages' own header (rem0017 phase 3), in place of the site Header: logo, title and the
 * EN / AR switch (`LanguageSwitch`, `?lang=`). Theme classes only, logical spacing for
 * RTL. Server component; the category nav (step 3) sticks below it.
 */
export const MenuHeader: React.FC<MenuHeaderProps> = ({
  title,
  logo,
  homeHref,
  showLanguageSwitch,
  locale,
}) => (
  <header className="border-b border-menu-border bg-menu-bg">
    <div className="container flex items-center justify-between gap-4 py-3">
      <Link
        href={homeHref}
        className={`${touchTarget} flex min-w-0 items-center gap-3 rounded text-menu-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-menu-primary`}
      >
        {logo?.url && (
          // eslint-disable-next-line @next/next/no-img-element -- a CMS upload of any size
          <img src={logo.url} alt="" className="h-10 w-auto shrink-0" />
        )}
        <span className="truncate text-lg font-semibold">{title}</span>
      </Link>
      {showLanguageSwitch && <LanguageSwitch locale={locale} />}
    </div>
  </header>
)
