import type { Metadata } from 'next'
import configPromise from '@payload-config'
import { notFound } from 'next/navigation'
import { getPayload, type TypedLocale } from 'payload'
import React, { cache } from 'react'

import { formatPrice } from '@/common/utils/formatPrice'
import { getFrontendTenantId } from '@/common/utils/frontendTenant'
import { getTenantDoc } from '@/common/utils/getTenantDoc'
import { isPreviewing } from '@/common/utils/isPreviewing'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { generateMeta } from '@/utilities/generateMeta'

import { MenuFooter } from '../_components/MenuFooter'
import { MenuHeader } from '../_components/MenuHeader'
import { readMenuLocale } from '../_data/locale'
import { mediaOf } from '../_data/media'
import { menuColorVars } from '../_data/menuColors'
import { getMenuPage } from '../_data/menuData'
import { menuStrings } from '../_i18n'

type Args = {
  params: Promise<{ slug: string }>
}

// shared by the page and its metadata (react cache: primitives only, compared by identity)
const loadMenuPage = cache(async (slug: string, locale: TypedLocale) => {
  const payload = await getPayload({ config: configPromise })
  const tenantId = await getFrontendTenantId()
  return getMenuPage(payload, tenantId, slug, { draft: await isPreviewing(), locale })
})

/**
 * A menu's guest page, `/menu/<slug>` on its tenant's host (rem0017 phase 3). Rendered per
 * request (no generateStaticParams: the tenant comes from the host). Unknown host, unknown slug,
 * another tenant's slug or a draft outside preview → 404. No loading.tsx: it starts streaming
 * before the page can call notFound(), and the 404 would go out as a 200.
 */
export default async function MenuPage({ params }: Args) {
  const tenantId = await getFrontendTenantId()
  if (tenantId === null) notFound()

  const { slug } = await params
  const locale = await readMenuLocale()
  const data = await loadMenuPage(slug, locale)
  if (!data) notFound()

  const { menu, sections, currency } = data
  const settings = await getTenantDoc('settings', tenantId, { depth: 1, locale })
  const t = menuStrings(locale)

  return (
    <div style={menuColorVars(menu.colors)} className="menu-theme flex min-h-dvh flex-col">
      {(await isPreviewing()) && <LivePreviewListener />}
      <MenuHeader
        title={menu.header?.title || menu.title}
        logo={mediaOf(menu.header?.logo) ?? mediaOf(settings?.logo)}
        homeHref="/menu"
        showLanguageSwitch={menu.header?.showLanguageSwitch !== false}
        locale={locale}
      />
      {/* step 3 replaces this list with the interactive <Menu /> */}
      <main className="container flex-1 py-6">
        {menu.intro?.heading && <h1 className="text-3xl font-semibold">{menu.intro.heading}</h1>}
        {menu.intro?.subheading && <p className="mt-1 text-menu-muted">{menu.intro.subheading}</p>}
        {sections.map((section) => (
          <section key={section.category?.id ?? 'other'} className="mt-8">
            <h2 className="text-xl font-semibold">{section.category?.title ?? t.other}</h2>
            <ul className="mt-3 grid gap-3">
              {section.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-4 rounded bg-menu-card p-3">
                  <span className="grid">
                    <span>{item.title}</span>
                    {!item.inStock && (
                      <span className="text-sm text-menu-muted">{t.outOfStock}</span>
                    )}
                  </span>
                  <bdi className="shrink-0">{formatPrice(item.price, currency, locale)}</bdi>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
      <MenuFooter settings={settings} locale={locale} />
    </div>
  )
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug } = await params
  const data = await loadMenuPage(slug, await readMenuLocale())
  return generateMeta({ doc: data?.menu ?? null })
}
