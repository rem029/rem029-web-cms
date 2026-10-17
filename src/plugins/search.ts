import { searchPlugin } from '@payloadcms/plugin-search'

import { beforeSyncWithSearch } from '@/search/beforeSync'
import { searchFields } from '@/search/fieldOverrides'

export const search = searchPlugin({
  collections: ['posts'],
  beforeSync: beforeSyncWithSearch,
  searchOverrides: {
    fields: ({ defaultFields }) => {
      return [...defaultFields, ...searchFields]
    },
  },
})
