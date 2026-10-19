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
import { MenuCarousel, type CarouselImage } from '../_components/MenuCarousel'
import { MenuFooter } from '../_components/MenuFooter'
import { MenuHeader } from '../_components/MenuHeader'
import { MenuIntro } from '../_components/MenuIntro'
import { readMenuLocale } from '../_data/locale'
import { mediaOf } from '../_data/media'
import { menuCustomCss } from '../_data/menuCustomCss'
import { menuColorVars } from '../_data/menuColors'
import { getMenuPage } from '../_data/menuData'
import { parseMenuUrl } from '../_data/menuUrl'

type Args = {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

// the page's searchParams as URLSearchParams (repeated params: the first wins)
const toSearchParams = (raw: Record<string, string | string[] | undefined>): URLSearchParams => {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(raw)) {
    const first = Array.isArray(value) ? value[0] : value
    if (first !== undefined) params.set(key, first)
  }
  return params
}

// shared by the page and its metadata (react cache: primitives only, compared by identity)
const loadMenuPage = cache(async (slug: string, locale: TypedLocale) => {
  const payload = await getPayload({ config: configPromise })
  const tenantId = await getFrontendTenantId()
  return getMenuPage(payload, tenantId, slug, { draft: await isPreviewing(), locale })
})

// the resized copies a full-width slide can use, smallest first (phones load the 600px one)
const SLIDE_SIZES = ['small', 'medium', 'large', 'xlarge'] as const

// the carousel's populated images: the large size as the fallback src, every resized copy in
// srcSet (with the original only when there are none)
const carouselImages = (menu: MenuDoc): CarouselImage[] =>
  (menu.carousel ?? []).flatMap((row) => {
    const media = mediaOf(row.image)
    const url = media?.sizes?.large?.url ?? media?.url
    if (!media || !url) return []
    const srcSet = SLIDE_SIZES.flatMap((size) => {
      const copy = media.sizes?.[size]
      return copy?.url && copy.width ? [`${copy.url} ${copy.width}w`] : []
    }).join(', ')
    return [{ url, srcSet: srcSet || undefined, alt: media.alt ?? '' }]
  })

/**
 * A menu's guest page, `/menu/<slug>` on its tenant's host (rem0017 phase 3). Rendered per
 * request (no generateStaticParams: the tenant comes from the host). Unknown host, unknown slug,
 * another tenant's slug or a draft outside preview → the 404 page, after loading.tsx's skeleton
 * (streamed, so with a 200 status and noindex: user decision 2026-10-17). The url's `?item=`,
 * `?category=`, `?allergens=`, `?period=` set the menu's first state (`parseMenuUrl`).
 */
export default async function MenuPage({ params, searchParams }: Args) {
  const tenantId = await getFrontendTenantId()
  if (tenantId === null) notFound()

  const { slug } = await params
  const locale = await readMenuLocale()
  const data = await loadMenuPage(slug, locale)
  if (!data) notFound()

  const { menu, sections, currency } = data
  const settings = await getTenantDoc('settings', tenantId, { depth: 1, locale })
  const css = menuCustomCss(menu.customCss)

  return (
    <div
      style={menuColorVars(menu.colors)}
      className="menu-page menu-theme flex min-h-dvh flex-col"
    >
      {(await isPreviewing()) && <LivePreviewListener />}
      {css && <style dangerouslySetInnerHTML={{ __html: css }} />}
      <MenuHeader
        title={menu.header?.title || menu.title}
        logo={mediaOf(menu.header?.logo) ?? mediaOf(settings?.logo)}
        homeHref="/menu"
        showLanguageSwitch={menu.header?.showLanguageSwitch !== false}
        locale={locale}
      />
      <main className="flex-1">
        <MenuCarousel images={carouselImages(menu)} />
        <div className="container py-6">
          <MenuIntro
            heading={menu.intro?.heading}
            subheading={menu.intro?.subheading}
            title={menu.title}
          />
          <Menu
            menuId={menu.id}
            sections={sections}
            currency={currency}
            locale={locale}
            filters={menu.filters}
            initial={parseMenuUrl(toSearchParams(await searchParams))}
          />
        </div>
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
