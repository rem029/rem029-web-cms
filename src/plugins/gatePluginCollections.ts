import type { CollectionSlug, Plugin } from 'payload'

import { accessCheckResolver, hiddenResolver } from '@/common/utils/access'

// step 3b: ADD — forms read → publishedOrPermission('forms') (forms get drafts): the public sees
// published forms only, members with read on forms also their tenant's drafts
// plugin collections: the ops a plugin leaves open to any signed-in user come from the profile
// instead, and so does the nav. public ops stay as the plugins set them (forms/redirects/search
// read, form-submissions create); form-submissions update stays off.
const profileGatedOps: Partial<
  Record<CollectionSlug, ('read' | 'create' | 'update' | 'delete')[]>
> = {
  forms: ['create', 'update', 'delete'],
  'form-submissions': ['read', 'delete'],
  redirects: ['create', 'update', 'delete'],
  search: ['update', 'delete'],
}

export const gatePluginCollections: Plugin = (config) => ({
  ...config,
  collections: config.collections?.map((collection) => {
    const slug = collection.slug as CollectionSlug
    const ops = profileGatedOps[slug]
    if (!ops) return collection
    return {
      ...collection,
      access: {
        ...collection.access,
        ...Object.fromEntries(ops.map((op) => [op, accessCheckResolver(slug, op)])),
      },
      admin: { ...collection.admin, hidden: hiddenResolver(slug) },
    }
  }),
})
