import { getServerSideSitemap } from 'next-sitemap'
import { getPayload } from 'payload'
import config from '@payload-config'
import { unstable_cache } from 'next/cache'

import { menusTag } from '@/common/hooks/revalidateMenus'
import { getFrontendTenantId, getFrontendTenantURL } from '@/common/utils/frontendTenant'
import { listMenuSitemap } from '@/app/(frontend)/menu/_data/menuSitemap'

// cached per tenant with the menus' own tag, so publishing or deleting a menu refreshes it
const getMenuSitemap = (tenantId: number, siteURL: string) =>
  unstable_cache(
    async (id: number, url: string) => listMenuSitemap(await getPayload({ config }), id, url),
    ['menu-sitemap'],
    { tags: [menusTag(tenantId)] },
  )(tenantId, siteURL)

export async function GET() {
  const tenantId = await getFrontendTenantId()
  if (!tenantId) {
    return getServerSideSitemap([])
  }

  const siteURL = await getFrontendTenantURL()
  return getServerSideSitemap(await getMenuSitemap(tenantId, siteURL))
}
