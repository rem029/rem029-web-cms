import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { unstable_cache } from 'next/cache'
import { frontendTenantWhere } from '@/common/utils/frontendTenant'

export async function getRedirects(tenantId: number, depth = 1) {
  const payload = await getPayload({ config: configPromise })

  const { docs: redirects } = await payload.find({
    collection: 'redirects',
    depth,
    limit: 0,
    pagination: false,
    where: frontendTenantWhere(tenantId),
  })

  return redirects
}

/**
 * Returns a unstable_cache function mapped with the cache tag for 'redirects'.
 *
 * Cache all redirects together to avoid multiple fetches.
 */
export const getCachedRedirects = () =>
  unstable_cache(async (tenantId: number) => getRedirects(tenantId), ['redirects'], {
    tags: ['redirects'],
  })
