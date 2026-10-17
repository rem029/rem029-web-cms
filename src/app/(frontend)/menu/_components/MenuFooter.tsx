import Link from 'next/link'
import type { TypedLocale } from 'payload'
import React from 'react'

import { SocialMedia } from '@/components/Social'
import type { Setting } from '@/payload-types'

import { menuStrings } from '../_i18n'

export type MenuFooterProps = {
  settings: Setting | null
  locale: TypedLocale
}

/**
 * The menu pages' own footer (rem0017 phase 3), in place of the site Footer: what a guest at the
 * table needs: the business name, phone (tel: link), address, social links and a link to all
 * menus. Rows without a value are left out. Theme classes only, logical spacing for RTL.
 */
export const MenuFooter: React.FC<MenuFooterProps> = ({ settings, locale }) => {
  const t = menuStrings(locale)
  const phone = settings?.contact?.phone
  const address = settings?.address?.full_address

  return (
    <footer className="border-t border-menu-border bg-menu-card text-menu-text">
      <div className="container grid gap-2 py-6 text-start text-sm">
        {settings?.siteName && <p className="font-semibold">{settings.siteName}</p>}
        {phone && (
          <a
            href={`tel:${phone}`}
            className="inline-flex min-h-6 w-fit items-center text-menu-text underline-offset-4 hover:underline [@media(pointer:coarse)]:min-h-11"
            dir="ltr"
          >
            {phone}
          </a>
        )}
        {address && <p className="text-menu-muted">{address}</p>}
        <SocialMedia
          classNameContainer="flex gap-3"
          classNameItem="text-lg hover:text-menu-primary"
          socialMedia={settings?.socialMedia}
        />
        <Link
          href="/menu"
          className="inline-flex min-h-6 w-fit items-center text-menu-text underline-offset-4 hover:underline [@media(pointer:coarse)]:min-h-11"
        >
          {t.allMenus}
        </Link>
      </div>
    </footer>
  )
}
