import type { CollectionSlug, Plugin } from 'payload'

import { createdUpdatedByFields } from '@/common/fields/createdUpdatedBy'
import { setCreatedUpdatedBy } from '@/common/hooks/setCreatedUpdatedBy'
import { createdUpdatedByCollections } from '@/common/utils/createdUpdatedByCollections'

// createdBy / updatedBy on every listed collection, plugin collections included. runs after the
// plugins that create collections (forms, redirects), so they get them too
export const addCreatedUpdatedBy: Plugin = (config) => ({
  ...config,
  collections: config.collections?.map((collection) => {
    if (!createdUpdatedByCollections.includes(collection.slug as CollectionSlug)) return collection
    return {
      ...collection,
      fields: [...collection.fields, ...createdUpdatedByFields],
      hooks: {
        ...collection.hooks,
        beforeChange: [...(collection.hooks?.beforeChange ?? []), setCreatedUpdatedBy],
      },
    }
  }),
})
