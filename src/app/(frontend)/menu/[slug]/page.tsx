import type { Metadata } from 'next'
import configPromise from '@payload-config'
import { notFound } from 'next/navigation'
import { getPayload, type TypedLocale } from 'payload'
import React, { cache } from 'react'

import { getFrontendTenantId } from '@/common/utils/frontendTenant'
import { getTenantDoc } from '@/common/utils/getTenantDoc'
import { isPreviewing } from '@/common/utils/isPreviewing'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import type { Menu as MenuDoc } from '@/payload-types'
import { generateMeta } from '@/utilities/generateMeta'

import { Menu } from '../_components/Menu'
import { MenuCarousel } from '../_components/MenuCarousel'
import { MenuFooter } from '../_components/MenuFooter'
import { MenuHeader } from '../_components/MenuHeader'
import { readMenuLocale } from '../_data/locale'
import { mediaOf } from '../_data/media'
import { menuColorVars } from '../_data/menuColors'
import { getMenuPage } from '../_data/menuData'

type Args = {
  params: Promise<{ slug: string }>
}

// shared by the page and its metadata (react cache: primitives only, compared by identity)
const loadMenuPage = cache(async (slug: string, locale: TypedLocale) => {
  const payload = await getPayload({ config: configPromise })
  const tenantId = await getFrontendTenantId()
  return getMenuPage(payload, tenantId, slug, { draft: await isPreviewing(), locale })
})

// the carousel's populated images, large size when there is one
const carouselImages = (menu: MenuDoc): { url: string; alt: string }[] => {
  // 1. menu.carousel rows → mediaOf(row.image), drop nulls
  // 2. url = sizes.large?.url ?? url, alt = media.alt ?? ''; drop rows without a url
  void menu
  return []
}

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
      <MenuCarousel images={carouselImages(menu)} />
      <main className="container flex-1 py-6">
        {menu.intro?.heading && <h1 className="text-3xl font-semibold">{menu.intro.heading}</h1>}
        {menu.intro?.subheading && <p className="mt-1 text-menu-muted">{menu.intro.subheading}</p>}
        <Menu
          menuId={menu.id}
          sections={sections}
          currency={currency}
          locale={locale}
          filters={menu.filters}
        />
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
