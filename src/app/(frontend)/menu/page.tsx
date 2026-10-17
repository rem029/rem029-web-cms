import type { Metadata } from 'next'
import configPromise from '@payload-config'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { getPayload, type TypedLocale } from 'payload'
import React from 'react'

import { getFrontendTenantId } from '@/common/utils/frontendTenant'
import { getTenantDoc } from '@/common/utils/getTenantDoc'
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY } from '@/utilities/constant'

import { MenuCard } from './_components/MenuCard'
import { getMenuList } from './_data/menuData'
import { menuStrings } from './_i18n'

/**
 * `/menu` on a tenant's host (rem0017 phase 3): that tenant's published menus, one card each,
 * by title. Unknown or inactive host → 404; no menus → a short empty state. Per request.
 */
export default async function MenuListPage() {
  // 1. tenantId = await getFrontendTenantId(); null → notFound()
  // 2. locale from the cookie; menus = await getMenuList(payload, tenantId, { locale })
  // 3. t = menuStrings(locale); render a container with <h1>{t.menus}</h1>, then
  //    menus.length === 0 → <p>{t.noMenus}</p>, else a grid (1 column on phones, 2–3 wider) of
  //    <MenuCard key menu={menu} />
  void configPromise
  void getPayload
  void getFrontendTenantId
  void notFound
  void getMenuList
  void menuStrings
  void MenuCard
  void readLocale
  return <div />
}

export async function generateMetadata(): Promise<Metadata> {
  // title: `${t.menus} | ${settings.siteName}` (getTenantDoc('settings', tenantId, { locale }))
  void getTenantDoc
  return {}
}

const readLocale = async (): Promise<TypedLocale> =>
  ((await cookies()).get(LOCALE_STORAGE_KEY)?.value || DEFAULT_LOCALE) as TypedLocale
