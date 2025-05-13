import type { Metadata } from 'next'

import { PayloadRedirects } from '@/components/PayloadRedirects'
import configPromise from '@payload-config'
import { getPayload, TypedLocale, type RequiredDataFromCollectionSlug } from 'payload'
import { cookies, draftMode } from 'next/headers'
import React, { cache } from 'react'

import { RenderBlocks } from '@/blocks/old/RenderBlocks'
import { RenderHero } from '@/heros/RenderHero'
import { generateMeta } from '@/utilities/generateMeta'
import PageClient from './page.client'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { css } from '@/utilities/constants'
import { getStyles } from '@/fields/css'
import { homeStatic } from '@/endpoints/seed/home-static'
import { LOCALE_STORAGE_KEY, DEFAULT_LOCALE } from '@/utilities/constant'

export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })
  const pages = await payload.find({
    collection: 'pages',
    draft: false,
    limit: 1000,
    overrideAccess: false,
    pagination: false,
    select: {
      slug: true,
    },
  })

  const params = pages.docs
    ?.filter((doc) => {
      return doc.slug !== 'home'
    })
    .map(({ slug }) => {
      return { slug }
    })

  return params
}

type Args = {
  params: Promise<{
    slug?: string
  }>
  searchParams: Promise<{ lang?: TypedLocale }>
}

export default async function Page({ params: paramsPromise }: Args) {
  const { isEnabled: draft } = await draftMode()
  const { slug = 'home' } = await paramsPromise

  const url = '/' + slug

  const cookieStore = await cookies()
  const locale = (cookieStore.get(LOCALE_STORAGE_KEY)?.value || DEFAULT_LOCALE) as TypedLocale

  let page: RequiredDataFromCollectionSlug<'pages'> | null

  page = await queryPageBySlug({
    slug,
    locale,
  })

  // Remove this code once your website is seeded
  if (!page && slug === 'home') {
    page = homeStatic
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
  const { slug = 'home' } = await paramsPromise

  const cookieStore = await cookies()
  const locale = (cookieStore.get(LOCALE_STORAGE_KEY)?.value || DEFAULT_LOCALE) as TypedLocale

  const page = await queryPageBySlug({
    slug,
    locale,
  })

  return generateMeta({ doc: page })
}

const queryPageBySlug = cache(async ({ slug, locale }: { slug: string; locale?: TypedLocale }) => {
  locale = locale || 'en'

  const { isEnabled: draft } = await draftMode()
  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'pages',
    draft,
    limit: 1,
    pagination: false,
    overrideAccess: draft,
    where: {
      slug: {
        equals: slug,
      },
    },
    locale,
  })

  return result.docs?.[0] || null
})
