import type { CollectionSlug } from 'payload'

export const tenantScopedCollections: CollectionSlug[] = [
  'pages',
  'posts',
  'media',
  'categories',
  'analytics',
  'redirects',
  'forms',
  'form-submissions',
  'search',
]

// one doc per tenant (were globals before multi-tenancy)
export const tenantGlobalCollections: CollectionSlug[] = ['header', 'footer', 'theme', 'settings']

export const isTenantCollection = (slug: CollectionSlug | string): boolean =>
  tenantScopedCollections.some((s) => s === slug) ||
  tenantGlobalCollections.some((s) => s === slug)

const isRecord = (val: unknown): val is Record<string, unknown> =>
  typeof val === 'object' && val !== null

export const extractTenantId = (val: unknown): number | null => {
  if (typeof val === 'number' && Number.isInteger(val)) {
    return val
  }
  if (typeof val === 'string') {
    const parsed = Number(val)
    if (Number.isInteger(parsed)) return parsed
  }
  if (isRecord(val) && 'id' in val) {
    if (typeof val.id === 'number' && Number.isInteger(val.id)) {
      return val.id
    }
    if (typeof val.id === 'string') {
      const parsed = Number(val.id)
      if (Number.isInteger(parsed)) return parsed
    }
  }
  return null
}
