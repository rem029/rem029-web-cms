import type { CollectionSlug } from 'payload'

/**
 * Collections that get `createdBy` / `updatedBy` (fields + hook) from the `addCreatedUpdatedBy`
 * plugin. Every collection is in exactly one of these two lists (checked by
 * `scripts/verify/createdUpdatedBy.ts`), so a new collection can't be forgotten: add it here.
 */
export const createdUpdatedByCollections: CollectionSlug[] = [
  'pages',
  'posts',
  'media',
  'header',
  'footer',
  'theme',
  'settings',
  'tenants',
  'users-access',
  'categories',
  'forms',
  'redirects',
  'users',
]

// deliberately without them
export const withoutCreatedUpdatedBy: CollectionSlug[] = [
  // written by visitors or synced by a plugin, never edited by a user
  'analytics',
  'form-submissions',
  'search',
]
