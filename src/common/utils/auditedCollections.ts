import type { CollectionSlug } from 'payload'

/**
 * Collections whose creates, updates and deletes are written to `audit-logs` by the `addAuditLog`
 * plugin (`auditLogAfterChange` / `auditLogAfterDelete`). Every collection is in exactly one of
 * these two lists (checked by `tests/audit-logs/coverage.test.ts`), so a new collection can't be
 * forgotten: add it here.
 */
export const auditedCollections: CollectionSlug[] = [
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
  // the restaurant menu: catalog and menus
  'menu-categories',
  'menu-allergens',
  'menu-tags',
  'menu-items',
  'menus',
]

// deliberately not audited
export const notAudited: CollectionSlug[] = [
  // the log itself: logging it would loop
  'audit-logs',
  // written by visitors in high volume, with their personal data; never edited by a user
  'analytics',
  'form-submissions',
  // synced from posts by the search plugin (the post's own change is logged)
  'search',
]
