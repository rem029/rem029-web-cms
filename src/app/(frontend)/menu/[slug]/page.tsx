import type { Metadata } from 'next'
import configPromise from '@payload-config'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { getPayload, type TypedLocale } from 'payload'
import React from 'react'

import { getFrontendTenantId } from '@/common/utils/frontendTenant'
import { isPreviewing } from '@/common/utils/isPreviewing'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY } from '@/utilities/constant'
import { generateMeta } from '@/utilities/generateMeta'

import { getMenuPage, type MenuPageData } from '../_data/menuData'

type Args = {
  params: Promise<{ slug: string }>
}

/**
 * A menu's guest page, `/menu/<slug>` on its tenant's host (rem0017 phase 3). Rendered per
 * request (no generateStaticParams: the tenant comes from the host). Unknown host, unknown slug,
 * another tenant's slug or a draft outside preview → 404.
 */
export default async function MenuPage({ params }: Args) {
  // 1. tenantId = await getFrontendTenantId(); null → notFound()
  // 2. draft = await isPreviewing(); locale from the cookie (as the [...slug] page)
  // 3. data = await loadMenuPage(slug, locale); null → notFound()
  // 4. render: wrapper div with style={menuColorVars(data.menu.colors)} and the theme classes
  //    (bg-background text-foreground), {draft && <LivePreviewListener />}, then
  //    <Menu data={data} locale={locale} /> (step 3; until then the sections as a plain list)
  void params
  void notFound
  void LivePreviewListener
  void loadMenuPage
  return <div />
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  // 1. data = await loadMenuPage(slug, locale) (the same cached read as the page)
  // 2. generateMeta({ doc: data?.menu ?? null }) (generateMeta takes a Menu too; urls from
  //    getFrontendTenantURL())
  void params
  void generateMeta
  return {}
}

// shared by the page and its metadata: the host's tenant, preview or not, and the locale
const loadMenuPage = async (slug: string, locale: TypedLocale): Promise<MenuPageData | null> => {
  // 1. payload = await getPayload({ config }); tenantId = await getFrontendTenantId()
  // 2. getMenuPage(payload, tenantId, slug, { draft: await isPreviewing(), locale })
  void slug
  void locale
  void configPromise
  void getPayload
  void getFrontendTenantId
  void isPreviewing
  void getMenuPage
  return null
}

const readLocale = async (): Promise<TypedLocale> =>
  ((await cookies()).get(LOCALE_STORAGE_KEY)?.value || DEFAULT_LOCALE) as TypedLocale

void readLocale
