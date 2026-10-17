/** Reading audit-logs rows in tests: what's stored (overrideAccess), by the doc they're about. */
import type { CollectionSlug, GlobalSlug, Payload, Where } from 'payload'

import type { AuditLog } from '@/payload-types'

import { contentLayout, richText } from '../common/content'

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** The rows matching `where`, oldest first, as stored. */
export const rowsWhere = async (payload: Payload, where: Where): Promise<AuditLog[]> => {
  const { docs } = await payload.find({
    collection: 'audit-logs',
    where,
    sort: 'createdAt',
    pagination: false,
    depth: 0,
  })
  return docs
}

/** The rows about one doc (or global), oldest first. */
export const rowsFor = (
  payload: Payload,
  slug: CollectionSlug | GlobalSlug,
  id: number | string,
): Promise<AuditLog[]> =>
  rowsWhere(payload, {
    and: [{ collectionSlug: { equals: slug } }, { docId: { equals: String(id) } }],
  })

/** A row's `changes` as an object (`{}` when it has none). */
export const changesOf = (row: AuditLog | undefined): Record<string, unknown> =>
  isRecord(row?.changes) ? row.changes : {}

/** A `{ from, to }` change, compared by value: Postgres jsonb reorders the keys. */
export const isChange = (value: unknown, from: unknown, to: unknown): boolean =>
  isRecord(value) && value.from === from && value.to === to

/** Every key at any depth of a value. */
export const keysOf = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.flatMap(keysOf)
  if (!isRecord(value)) return []
  return Object.entries(value).flatMap(([key, val]) => [key, ...keysOf(val)])
}

/** A published page in a business, with a content block holding `title`. */
export const pageData = (title: string, tenantId: number) => ({
  title,
  slug: title,
  tenant: tenantId,
  _status: 'published' as const,
  hero: { main: { type: 'none' as const } },
  layout: contentLayout(richText(title)),
})
