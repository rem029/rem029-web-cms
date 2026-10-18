import type { Payload } from 'payload'

import { frontendTenantWhere } from '@/common/utils/frontendTenant'

/** One `<url>` of the menu sitemap. */
export type MenuSitemapEntry = { loc: string; lastmod: string }

/**
 * The host tenant's menu urls for `/menu-sitemap.xml` (rem0017 phase 3 step 4): `/menu` and
 * `/menu/<slug>` for each published menu. A tenant without menus gets none (`/menu` is only an
 * empty state then); no tenant gets none.
 */
export const listMenuSitemap = async (
  payload: Payload,
  tenantId: number | null,
  siteURL: string,
): Promise<MenuSitemapEntry[]> => {
  if (tenantId === null) return []

  // as a guest: published menus only
  const { docs } = await payload.find({
    collection: 'menus',
    where: frontendTenantWhere(tenantId),
    overrideAccess: false,
    draft: false,
    depth: 0,
    pagination: false,
    sort: 'title',
    select: { slug: true, updatedAt: true },
  })
  const menus = docs.filter((menu) => Boolean(menu.slug))
  payload.logger.debug({ msg: 'menu sitemap', tenantId, menus: menus.length })
  if (menus.length === 0) return []

  // ISO dates sort as strings
  const latest =
    menus
      .map((menu) => menu.updatedAt)
      .sort()
      .at(-1) ?? new Date().toISOString()
  return [
    { loc: `${siteURL}/menu`, lastmod: latest },
    ...menus.map((menu) => ({ loc: `${siteURL}/menu/${menu.slug}`, lastmod: menu.updatedAt })),
  ]
}
