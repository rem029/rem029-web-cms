import { sql } from '@payloadcms/db-postgres'
import type { CollectionAfterChangeHook } from 'payload'

import { extractTenantId as relationId } from '@/common/utils/tenantCollections'

// hideable collections with drafts → their main table (`<table>_rels` holds visibleTo)
const TABLES: Record<string, string> = { pages: 'pages', posts: 'posts' }

type Query = ReturnType<typeof sql>

// Payload types a transaction session as `unknown` (adapter-agnostic); on Postgres it's a
// drizzle transaction
const isExecutor = (val: unknown): val is { execute: (query: Query) => Promise<unknown> } =>
  typeof val === 'object' && val !== null && 'execute' in val && typeof val.execute === 'function'

const idsOf = (value: unknown): number[] =>
  (Array.isArray(value) ? value : [])
    .map((item) => relationId(item))
    .filter((id): id is number => id !== null)

/**
 * Hideable collections with drafts: a draft save only writes the versions table, but read,
 * update and delete access are checked against the main row, so a page hidden in a draft could
 * still be opened, edited or deleted by any member. When a draft changes `isHidden` or
 * `visibleTo`, copy just those two to the main row, in the same transaction. SQL, because the
 * adapter's `updateOne` rewrites the row's blocks and arrays from the data it's given. The
 * published content is untouched, so the public site is unaffected.
 */
export const syncHiddenToDoc: CollectionAfterChangeHook = async ({ collection, doc, req }) => {
  const table = TABLES[collection.slug]
  if (!table || doc._status !== 'draft') return doc

  const main = await req.payload.db.findOne({
    collection: collection.slug,
    where: { id: { equals: doc.id } },
    req,
  })
  if (!main) return doc

  const isHidden = doc.isHidden === true
  const visibleTo = [...new Set(idsOf(doc.visibleTo))]
  const mainIsHidden = 'isHidden' in main && main.isHidden === true
  const mainVisibleTo = idsOf('visibleTo' in main ? main.visibleTo : [])
  const same =
    mainIsHidden === isHidden && [...mainVisibleTo].sort().join() === [...visibleTo].sort().join()
  if (same) return doc

  const { db } = req.payload
  const transactionID = req.transactionID ? await req.transactionID : undefined
  // the request's transaction, as Payload's own getTransaction picks it, else the pool
  const session = transactionID !== undefined ? db.sessions?.[transactionID]?.db : undefined
  const run = (query: Query) => (isExecutor(session) ? session : db.drizzle).execute(query)
  const rels = `${table}_rels`

  await run(
    sql`UPDATE ${sql.identifier(table)} SET "is_hidden" = ${isHidden} WHERE "id" = ${doc.id}`,
  )
  await run(
    sql`DELETE FROM ${sql.identifier(rels)} WHERE "parent_id" = ${doc.id} AND "path" = 'visibleTo'`,
  )
  for (const [index, userId] of visibleTo.entries()) {
    await run(
      sql`INSERT INTO ${sql.identifier(rels)} ("order", "parent_id", "path", "users_id")
          VALUES (${index + 1}, ${doc.id}, 'visibleTo', ${userId})`,
    )
  }

  req.payload.logger.info({
    msg: 'hidden: copied to the main row from a draft',
    slug: collection.slug,
    docId: doc.id,
    userId: req.user?.id,
    isHidden,
    visibleTo,
  })
  return doc
}
