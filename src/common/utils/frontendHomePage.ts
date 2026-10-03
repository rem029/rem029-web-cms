import type { Payload, TypedLocale, Where } from 'payload'
import type { Page } from '@/payload-types'
import { frontendTenantWhere } from '@/common/utils/frontendTenant'
import { getTenantDoc } from '@/common/utils/getTenantDoc'
import { extractTenantId } from '@/common/utils/tenantCollections'

export type HomePageSource = 'settings' | 'slug' | 'none'

type Options = { draft: boolean; locale: TypedLocale }

const findPage = async (
  payload: Payload,
  tenantId: number,
  where: Where,
  { draft, locale }: Options,
): Promise<Page | null> => {
  const { docs } = await payload.find({
    collection: 'pages',
    draft,
    limit: 1,
    pagination: false,
    overrideAccess: draft,
    where: frontendTenantWhere(tenantId, where),
    locale,
  })
  return docs[0] ?? null
}

/**
 * The page a tenant serves at `/`: Settings → Homepage, else its page with slug `home`, else
 * none (the empty state). Both lookups are tenant-filtered, so it's never another tenant's page.
 */
export const findHomePage = async (
  payload: Payload,
  tenantId: number,
  options: Options,
): Promise<{ page: Page | null; source: HomePageSource }> => {
  const settings = await getTenantDoc('settings', tenantId)
  // extractTenantId narrows any relationship value (id or populated doc) to its id
  const homepageId = extractTenantId(settings?.homepage)

  const fromSettings = homepageId
    ? await findPage(payload, tenantId, { id: { equals: homepageId } }, options)
    : null
  const fromSlug = fromSettings
    ? null
    : await findPage(payload, tenantId, { slug: { equals: 'home' } }, options)

  const page = fromSettings ?? fromSlug
  const source: HomePageSource = fromSettings ? 'settings' : fromSlug ? 'slug' : 'none'
  payload.logger.debug({ msg: 'home page', tenantId, source, pageId: page?.id })
  return { page, source }
}
