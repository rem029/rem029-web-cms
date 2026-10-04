import type { MetadataRoute } from 'next'
import { getFrontendTenantId, getFrontendTenantURL } from '@/common/utils/frontendTenant'

export default async function robots(): Promise<MetadataRoute.Robots> {
  const tenantId = await getFrontendTenantId()

  if (!tenantId) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
    }
  }

  const url = await getFrontendTenantURL()

  return {
    rules: {
      userAgent: '*',
      disallow: '/admin',
    },
    sitemap: [`${url}/pages-sitemap.xml`, `${url}/posts-sitemap.xml`],
  }
}
