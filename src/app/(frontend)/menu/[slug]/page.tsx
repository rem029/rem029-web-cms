import type { Metadata } from 'next'
import configPromise from '@payload-config'
import { notFound } from 'next/navigation'
import { getPayload, type TypedLocale } from 'payload'
import React, { cache } from 'react'

import { getFrontendTenantId } from '@/common/utils/frontendTenant'
import { getTenantDoc } from '@/common/utils/getTenantDoc'
import { isPreviewing } from '@/common/utils/isPreviewing'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import type { Menu as MenuDoc, Setting } from '@/payload-types'
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
import { openStatus, type MenuOrdering } from '../_data/ordering'
import { resolveTable } from '../_data/guestOrders'

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

// what the menu needs to take orders (rem0018 phase 3 step 2a), or null on a browse-only menu and
// in live preview (an editor must not place real orders). `?table=` is checked on the server: a
// table that isn't on this menu opens the picker with a notice.
const menuOrdering = async (args: {
  tenantId: number
  slug: string
  locale: TypedLocale
  tableSlug: string | null
  enabled: boolean
  showPrices: boolean
  restaurant: Setting['restaurant'] | undefined
}): Promise<MenuOrdering | null> => {
  if (!args.enabled) return null

  const payload = await getPayload({ config: configPromise })
  const resolved = args.tableSlug
    ? await resolveTable(
        payload,
        { tenantId: args.tenantId, ip: null, locale: args.locale },
        { menuSlug: args.slug, tableSlug: args.tableSlug },
      )
    : null

  return {
    tenantId: args.tenantId,
    menuSlug: args.slug,
    showPrices: args.showPrices,
    table: resolved?.ok ? resolved.table : null,
    tableRefused: resolved !== null && !resolved.ok,
    ordersOnlyWhenOpen: args.restaurant?.ordersOnlyWhenOpen === true,
    open: openStatus(
      args.restaurant?.openingHours ?? [],
      args.restaurant?.timezone || 'UTC',
      new Date(),
    ),
  }
}

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

  const search = toSearchParams(await searchParams)
  const ordering = await menuOrdering({
    tenantId,
    slug,
    locale,
    tableSlug: search.get('table'),
    enabled: menu.ordering?.enabled === true && !(await isPreviewing()),
    showPrices: menu.ordering?.showPrices !== false,
    restaurant: settings?.restaurant,
  })

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
        openStatus={ordering?.open}
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
            initial={parseMenuUrl(search)}
            ordering={ordering}
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
