import type { Config } from '@/payload-types'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { unstable_cache } from 'next/cache'
import { frontendTenantWhere } from '@/common/utils/frontendTenant'

type Collection = keyof Config['collections']

async function getDocument(collection: Collection, slug: string, tenantId: number, depth = 0) {
  const payload = await getPayload({ config: configPromise })

  const page = await payload.find({
    collection,
    depth,
    where: frontendTenantWhere(tenantId, {
      slug: {
        equals: slug,
      },
    }),
  })

  return page.docs[0]
}

/**
 * Returns a unstable_cache function mapped with the cache tag for the slug
 */
export const getCachedDocument = (collection: Collection, slug: string) =>
  unstable_cache(
    async (tenantId: number) => getDocument(collection, slug, tenantId),
    [collection, slug],
    {
      tags: [`${collection}_${slug}`],
    },
  )
