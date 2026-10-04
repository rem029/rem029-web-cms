import { getServerSideSitemap } from 'next-sitemap'
import { getPayload } from 'payload'
import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import {
  frontendTenantWhere,
  getFrontendTenantId,
  getFrontendTenantURL,
} from '@/common/utils/frontendTenant'

const getPostsSitemap = (tenantId: number, siteURL: string) =>
  unstable_cache(
    async (id: number, url: string) => {
      const payload = await getPayload({ config })

      const results = await payload.find({
        collection: 'posts',
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

      const sitemap = results.docs
        ? results.docs
            .filter((post) => Boolean(post?.slug))
            .map((post) => ({
              loc: `${url}/posts/${post?.slug}`,
              lastmod: post.updatedAt || dateFallback,
            }))
        : []

      return sitemap
    },
    ['posts-sitemap'],
    {
      tags: [`posts-sitemap_${tenantId}`],
    },
  )(tenantId, siteURL)

export async function GET() {
  const tenantId = await getFrontendTenantId()
  if (!tenantId) {
    return getServerSideSitemap([])
  }

  const siteURL = await getFrontendTenantURL()
  const sitemap = await getPostsSitemap(tenantId, siteURL)

  return getServerSideSitemap(sitemap)
}
