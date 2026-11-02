import Link from 'next/link'
import React from 'react'

import type { TypedLocale } from 'payload'

import type { Media } from '@/payload-types'

import type { OpenStatus } from '../_data/ordering'
import { menuStrings } from '../_i18n'
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
  /**
   * rem0018 phase 3 step 2a, ordering menus only: "Open now", or "Closed, opens Mon at 8:00"
   * (weekday in the guest's language), class `menu-open-status` with `is-open` / `is-closed`
   */
  openStatus?: OpenStatus
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
  openStatus,
}) => {
  const t = menuStrings(locale ?? 'en')

  return (
    <header className="menu-header border-b border-menu-border bg-menu-bg">
      <div className="menu-header-inner container flex items-center justify-between gap-4 py-3">
        <Link
          href={homeHref}
          className={`${touchTarget} flex min-w-0 items-center gap-3 rounded text-menu-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-menu-primary`}
        >
          {logo?.url && (
            // eslint-disable-next-line @next/next/no-img-element -- a CMS upload of any size
            <img src={logo.url} alt="" className="menu-logo h-10 w-auto shrink-0" />
          )}
          <span className="menu-header-title truncate text-lg font-semibold">{title}</span>
        </Link>
        <div className="flex items-center gap-3">
          {openStatus && (
            <span
              className={`menu-open-status text-sm font-medium ${
                openStatus.open ? 'is-open' : 'is-closed'
              }`}
            >
              {openStatus.open
                ? t.openNow
                : openStatus.next
                  ? t.closedOpens
                      .replace('{day}', t[openStatus.next.weekday])
                      .replace('{time}', openStatus.next.opens)
                  : t.closed}
            </span>
          )}
          {showLanguageSwitch && <LanguageSwitch locale={locale} />}
        </div>
      </div>
    </header>
  )
}
