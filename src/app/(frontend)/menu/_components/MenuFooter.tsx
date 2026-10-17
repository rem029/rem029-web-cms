import React from 'react'

import type { Setting } from '@/payload-types'
import type { TypedLocale } from 'payload'

export type MenuFooterProps = {
  settings: Setting | null
  locale: TypedLocale
}

/**
 * The menu pages' own footer (rem0017 phase 3), in place of the site Footer: what a guest at the
 * table needs: the business name, phone (tel: link), address and social links (the existing
 * `SocialMedia`), and a link to all menus. Rows without a value are left out; nothing at all →
 * just the name. Theme classes only, logical spacing for RTL. Server component.
 */
export const MenuFooter: React.FC<MenuFooterProps> = (props) => {
  // 1. t = menuStrings(locale)
  // 2. <footer className="border-t border-border bg-card text-card-foreground">
  //      <div className="container grid gap-2 py-6 text-start text-sm">
  //        <p className="font-semibold">{settings?.siteName}</p>
  //        {phone && <a href={`tel:${phone}`}>{phone}</a>}
  //        {address && <p>{address}</p>}
  //        <SocialMedia socialMedia={settings?.socialMedia} … />
  //        <Link href="/menu">{t.allMenus}</Link>
  //      </div>
  //    </footer>
  void props
  return <footer />
}
