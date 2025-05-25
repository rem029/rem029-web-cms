import type { Config } from 'src/payload-types'

import configPromise from '@payload-config'
import { getPayload, TypedLocale } from 'payload'
import { unstable_cache } from 'next/cache'

type Global = keyof Config['globals']

export async function getGlobal<T extends Global>(slug: T, depth = 0, locale?: TypedLocale) {
  const payload = await getPayload({ config: configPromise })

  const global = await payload.findGlobal({
    slug,
    depth,
    locale,
  })

  return global as Config['globals'][T]
}

/**
 * Returns a unstable_cache function mapped with the cache tag for the slug
 */
export const getCachedGlobal = (slug: Global, depth = 0, locale?: TypedLocale) =>
  unstable_cache(async () => getGlobal(slug, depth, locale), [slug], {
    tags: [`global_${slug}`],
  })
