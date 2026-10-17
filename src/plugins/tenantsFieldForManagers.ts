import type { Plugin } from 'payload'

import { filterTenantRowsForReader } from '@/collections/Users/hooks/filterTenantRowsForReader'
import { showToTenantManagers } from '@/common/utils/access'

// the multi-tenant plugin's `tenants` array on users: super users and tenant admins of any tenant see it in the admin
export const showTenantsFieldToManagers: Plugin = (config) => ({
  ...config,
  collections: config.collections?.map((collection) => {
    if (collection.slug !== 'users') return collection
    return {
      ...collection,
      fields: collection.fields.map((field) =>
        field.type === 'array' && field.name === 'tenants'
          ? {
              ...field,
              admin: { ...field.admin, condition: showToTenantManagers },
              hooks: {
                ...field.hooks,
                afterRead: [filterTenantRowsForReader, ...(field.hooks?.afterRead ?? [])],
              },
            }
          : field,
      ),
    }
  }),
})
