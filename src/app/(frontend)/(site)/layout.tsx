import { cookies } from 'next/headers'
import type { TypedLocale } from 'payload'
import React from 'react'

import { Footer } from '@/collections/Footer/Component'
import { Header } from '@/collections/Header/Component'
import { getFrontendTenantId } from '@/common/utils/frontendTenant'
import { getTenantDoc } from '@/common/utils/getTenantDoc'
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY } from '@/utilities/constant'

/**
 * The site's pages (homepage, pages, posts, search) with the tenant's Header and Footer. The menu
 * pages (`../menu`) sit outside this group: they have their own header and footer (rem0017).
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const locale = (cookieStore.get(LOCALE_STORAGE_KEY)?.value || DEFAULT_LOCALE) as TypedLocale
  const tenantId = await getFrontendTenantId()
  const settings = await getTenantDoc('settings', tenantId, { depth: 1, locale })

  return (
    <>
      <Header settings={settings} locale={locale} />
      {children}
      <Footer settings={settings} locale={locale} />
    </>
  )
}
