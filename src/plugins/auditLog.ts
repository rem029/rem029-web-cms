import type { CollectionSlug, Plugin } from 'payload'

import { auditLogAfterChange, auditLogAfterDelete } from '@/common/hooks/auditLog'
import { auditedCollections } from '@/common/utils/auditedCollections'

// creates, updates and deletes of every listed collection go to `audit-logs`, plugin collections
// included. the hooks go last, so the row sees what earlier hooks changed
export const addAuditLog: Plugin = (config) => ({
  ...config,
  collections: config.collections?.map((collection) => {
    if (!auditedCollections.includes(collection.slug as CollectionSlug)) return collection
    return {
      ...collection,
      hooks: {
        ...collection.hooks,
        afterChange: [...(collection.hooks?.afterChange ?? []), auditLogAfterChange],
        afterDelete: [...(collection.hooks?.afterDelete ?? []), auditLogAfterDelete],
      },
    }
  }),
})
