import type { Metadata } from 'next'
import configPromise from '@payload-config'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { getFrontendTenantId } from '@/common/utils/frontendTenant'
import { getTenantDoc } from '@/common/utils/getTenantDoc'

import { MenuCard } from './_components/MenuCard'
import { MenuFooter } from './_components/MenuFooter'
import { MenuHeader } from './_components/MenuHeader'
import { readMenuLocale } from './_data/locale'
import { mediaOf } from './_data/media'
import { getMenuList } from './_data/menuData'
import { menuStrings } from './_i18n'

/**
 * `/menu` on a tenant's host (rem0017 phase 3): that tenant's published menus, one card each,
 * by title. Unknown or inactive host → 404; no menus → a short empty state. Per request.
 */
export default async function MenuListPage() {
  const tenantId = await getFrontendTenantId()
  if (tenantId === null) notFound()

  const locale = await readMenuLocale()
  const payload = await getPayload({ config: configPromise })
  const menus = await getMenuList(payload, tenantId, { locale })
  const settings = await getTenantDoc('settings', tenantId, { depth: 1, locale })
  const t = menuStrings(locale)

  return (
    <div className="menu-theme flex min-h-dvh flex-col">
      <MenuHeader
        title={settings?.siteName || t.menus}
        logo={mediaOf(settings?.logo)}
        homeHref="/"
        showLanguageSwitch
        locale={locale}
      />
      <main className="container flex-1 py-6">
        <h1 className="text-3xl font-semibold">{t.menus}</h1>
        {menus.length === 0 ? (
          <p className="mt-4 text-menu-muted">{t.noMenus}</p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {menus.map((menu) => (
              <MenuCard key={menu.id} menu={menu} />
            ))}
          </div>
        )}
      </main>
      <MenuFooter settings={settings} locale={locale} />
    </div>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await readMenuLocale()
  const settings = await getTenantDoc('settings', await getFrontendTenantId(), { locale })
  const t = menuStrings(locale)
  return { title: settings?.siteName ? `${t.menus} | ${settings.siteName}` : t.menus }
}
