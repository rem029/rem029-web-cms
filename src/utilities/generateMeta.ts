import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import type { TypedLocale } from 'payload'

import type { Media, Page, Post, Config } from '../payload-types'

import { mergeOpenGraph } from './mergeOpenGraph'
import { getTenantDoc } from '@/common/utils/getTenantDoc'
import { getFrontendTenantId, getFrontendTenantURL } from '@/common/utils/frontendTenant'
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY } from './constant'

const getImageURL = async (image?: Media | Config['db']['defaultIDType'] | null) => {
  const serverUrl = await getFrontendTenantURL()

  let url = serverUrl + '/website-template-OG.webp'

  if (image && typeof image === 'object' && 'url' in image) {
    const ogUrl = image.sizes?.og?.url

    url = ogUrl ? serverUrl + ogUrl : serverUrl + image.url
  }

  return url
}

export const generateMeta = async (args: {
  doc: Partial<Page> | Partial<Post> | null
}): Promise<Metadata> => {
  const { doc } = args
  const tenantId = await getFrontendTenantId()
  // same locale source as the root layout, so ar pages get the ar site name in <title>
  const cookieStore = await cookies()
  const locale = (cookieStore.get(LOCALE_STORAGE_KEY)?.value || DEFAULT_LOCALE) as TypedLocale
  const settings = await getTenantDoc('settings', tenantId, { depth: 1, locale })

  const ogImage = await getImageURL(doc?.meta?.image)

  const siteName = settings?.siteName || 'CMS Website'

  const title = doc?.meta?.title ? doc?.meta?.title + ' | ' + siteName : siteName

  return {
    description: doc?.meta?.description,
    openGraph: mergeOpenGraph({
      description: doc?.meta?.description || '',
      images: ogImage
        ? [
            {
              url: ogImage,
            },
          ]
        : undefined,
      title,
      url: Array.isArray(doc?.slug) ? doc?.slug.join('/') : '/',
    }),
    title,
  }
}
