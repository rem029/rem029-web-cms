import { getServerSideSitemap } from 'next-sitemap'
import { getPayload } from 'payload'
import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import {
  frontendTenantWhere,
  getFrontendTenantId,
  getFrontendTenantURL,
} from '@/common/utils/frontendTenant'

// /posts has no index page yet (404), so only /search
const getDefaultSitemap = (siteURL: string) => {
  const dateFallback = new Date().toISOString()
  return [
    {
      loc: `${siteURL}/search`,
      lastmod: dateFallback,
    },
  ]
}

const getPagesSitemap = (tenantId: number, siteURL: string) =>
  unstable_cache(
    async (id: number, url: string) => {
      const payload = await getPayload({ config })

      const results = await payload.find({
        collection: 'pages',
        overrideAccess: false,
        draft: false,
        depth: 0,
        limit: 1000,
        pagination: false,
        where: frontendTenantWhere(id, {
          _status: {
            equals: 'published',
          },
        }),
        select: {
          slug: true,
          updatedAt: true,
        },
      })

      const dateFallback = new Date().toISOString()
      const defaultSitemap = getDefaultSitemap(url)

      const sitemap = results.docs
        ? results.docs
            .filter((page) => Boolean(page?.slug))
            .map((page) => {
              return {
                loc: page?.slug === 'home' ? `${url}/` : `${url}/${page?.slug}`,
                lastmod: page.updatedAt || dateFallback,
              }
            })
        : []

      return [...defaultSitemap, ...sitemap]
    },
    ['pages-sitemap'],
    {
      tags: [`pages-sitemap_${tenantId}`],
    },
  )(tenantId, siteURL)

export async function GET() {
  const tenantId = await getFrontendTenantId()
  if (!tenantId) {
    return getServerSideSitemap([])
  }

  const siteURL = await getFrontendTenantURL()
  const sitemap = await getPagesSitemap(tenantId, siteURL)

  return getServerSideSitemap(sitemap)
}
