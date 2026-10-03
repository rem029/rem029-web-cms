import { getServerSideSitemap } from 'next-sitemap'
import { getPayload } from 'payload'
import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import { frontendTenantWhere, getFrontendTenantId } from '@/common/utils/frontendTenant'

const SITE_URL =
  process.env.NEXT_PUBLIC_SERVER_URL ||
  process.env.VERCEL_PROJECT_PRODUCTION_URL ||
  'https://example.com'

const getDefaultSitemap = () => {
  const dateFallback = new Date().toISOString()
  return [
    {
      loc: `${SITE_URL}/search`,
      lastmod: dateFallback,
    },
    {
      loc: `${SITE_URL}/posts`,
      lastmod: dateFallback,
    },
  ]
}

const getPagesSitemap = unstable_cache(
  async (tenantId: number) => {
    const payload = await getPayload({ config })

    const results = await payload.find({
      collection: 'pages',
      overrideAccess: false,
      draft: false,
      depth: 0,
      limit: 1000,
      pagination: false,
      where: frontendTenantWhere(tenantId, {
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
    const defaultSitemap = getDefaultSitemap()

    const sitemap = results.docs
      ? results.docs
          .filter((page) => Boolean(page?.slug))
          .map((page) => {
            return {
              loc: page?.slug === 'home' ? `${SITE_URL}/` : `${SITE_URL}/${page?.slug}`,
              lastmod: page.updatedAt || dateFallback,
            }
          })
      : []

    return [...defaultSitemap, ...sitemap]
  },
  ['pages-sitemap'],
  {
    tags: ['pages-sitemap'],
  },
)

export async function GET() {
  const tenantId = await getFrontendTenantId()
  if (!tenantId) {
    return getServerSideSitemap(getDefaultSitemap())
  }

  const sitemap = await getPagesSitemap(tenantId)

  return getServerSideSitemap(sitemap)
}
