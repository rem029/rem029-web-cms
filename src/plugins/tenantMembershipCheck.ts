import type { CollectionSlug, Plugin } from 'payload'

import { enforceTenantMembership } from '@/common/hooks/enforceTenantMembership'
import { tenantGlobalCollections, tenantScopedCollections } from '@/common/utils/tenantCollections'

// form submissions take their tenant from the form (setFormSubmissionTenant), so anyone,
// signed in or not, can submit any tenant's public form; form uploads are written by the submit
// action the same way
const membershipCheckedCollections: CollectionSlug[] = [
  ...tenantScopedCollections.filter(
    (slug) => slug !== 'form-submissions' && slug !== 'form-uploads',
  ),
  ...tenantGlobalCollections,
]

// runs after multiTenantPlugin so plugin-created collections (redirects, forms, search) exist
export const addTenantMembershipCheck: Plugin = (config) => ({
  ...config,
  collections: config.collections?.map((collection) => {
    if (!membershipCheckedCollections.includes(collection.slug as CollectionSlug)) return collection
    return {
      ...collection,
      hooks: {
        ...collection.hooks,
        beforeChange: [enforceTenantMembership, ...(collection.hooks?.beforeChange ?? [])],
      },
    }
  }),
})
