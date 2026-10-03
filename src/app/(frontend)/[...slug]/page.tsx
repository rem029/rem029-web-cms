import type { Metadata } from 'next'

import { PayloadRedirects } from '@/components/PayloadRedirects'
import configPromise from '@payload-config'
import { getPayload, TypedLocale } from 'payload'
import { cookies, draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import React, { cache } from 'react'

import { RenderBlocks } from '@/blocks/old/RenderBlocks'
import { RenderHero } from '@/heros/RenderHero'
import { generateMeta } from '@/utilities/generateMeta'
import PageClient from './page.client'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { css } from '@/utilities/constants'
import { getStyles } from '@/fields/css'
import { HomeEmpty } from './HomeEmpty'
import { LOCALE_STORAGE_KEY, DEFAULT_LOCALE } from '@/utilities/constant'
import { frontendTenantWhere, getFrontendTenantId } from '@/common/utils/frontendTenant'
import { findHomePage } from '@/common/utils/frontendHomePage'

type Args = {
  params: Promise<{
    slug?: string[]
  }>
  searchParams: Promise<{ lang?: TypedLocale }>
}

// `/` has no slug param: it serves the tenant's homepage. `/home` is just the page with slug `home`
const slugPathOf = (slug?: string[]): string | null => (slug?.length ? slug.join('/') : null)

export default async function Page({ params: paramsPromise }: Args) {
  const { isEnabled: draft } = await draftMode()
  const slugPath = slugPathOf((await paramsPromise).slug)
  const url = '/' + (slugPath ?? '')

  // unknown or inactive host
  if (!(await getFrontendTenantId())) notFound()

  const cookieStore = await cookies()
  const locale = (cookieStore.get(LOCALE_STORAGE_KEY)?.value || DEFAULT_LOCALE) as TypedLocale

  const page = await queryPage(slugPath, locale)

  if (!page && slugPath === null) {
    return (
      <React.Fragment>
        <PayloadRedirects disableNotFound url={url} />
        <HomeEmpty locale={locale} />
      </React.Fragment>
    )
  }

  if (!page) {
    return <PayloadRedirects url={url} />
  }

  const { hero, layout, css_name, css_style } = page
  const { cssName, cssStyle } = getStyles({ css_name, css_style })

  return (
    <React.Fragment>
      {cssStyle && (
        <style
          dangerouslySetInnerHTML={{
            __html: cssStyle || '',
          }}
        />
      )}
      <div className={`${css('page')} ${cssName}`}>
        <div className={css('page__container')}>
          <PageClient />

          {/* Allows redirects for valid pages too */}
          <PayloadRedirects disableNotFound url={url} />

          {draft && <LivePreviewListener />}

          <RenderHero {...hero} />
          <RenderBlocks blocks={layout} />
        </div>
      </div>
    </React.Fragment>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const slugPath = slugPathOf((await paramsPromise).slug)

  const cookieStore = await cookies()
  const locale = (cookieStore.get(LOCALE_STORAGE_KEY)?.value || DEFAULT_LOCALE) as TypedLocale

  const page = await queryPage(slugPath, locale)

  return generateMeta({ doc: page })
}

// react's cache compares arguments by identity: pass primitives so Page and generateMetadata share it
const queryPage = cache(async (slugPath: string | null, locale: TypedLocale) => {
  if (slugPath !== null) return queryPageBySlug({ slug: slugPath, locale })

  const tenantId = await getFrontendTenantId()
  if (!tenantId) return null

  const { isEnabled: draft } = await draftMode()
  const payload = await getPayload({ config: configPromise })
  const { page } = await findHomePage(payload, tenantId, { draft, locale })
  return page
})

const queryPageBySlug = cache(async ({ slug, locale }: { slug: string; locale?: TypedLocale }) => {
  locale = locale || 'en'

  const tenantId = await getFrontendTenantId()
  if (!tenantId) {
    return null
  }

  const { isEnabled: draft } = await draftMode()
  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'pages',
    draft,
    limit: 1,
    pagination: false,
    overrideAccess: draft,
    where: frontendTenantWhere(tenantId, {
      slug: {
        equals: slug,
      },
    }),
    locale,
  })

  return result.docs?.[0] || null
})
