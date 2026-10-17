import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionSlug,
  GlobalAfterChangeHook,
} from 'payload'

import { diff, snapshot, tenantOf, writeAuditLog } from '@/common/utils/auditLog'

const isCollectionSlug = (
  slug: string,
  collections: Record<string, unknown>,
): slug is CollectionSlug => slug in collections

const isRecord = (val: unknown): val is Record<string, unknown> =>
  typeof val === 'object' && val !== null && !Array.isArray(val)

/**
 * Logs creates and updates to `audit-logs` (`writeAuditLog`, which never throws). Added last to
 * `afterChange` of every collection in `auditedCollections` by the `addAuditLog` plugin, so the
 * row sees what earlier hooks changed. Returns `doc` unchanged.
 *
 * Draft saves (pages, posts; autosave runs every 100 ms of typing) aren't logged: Payload's
 * versions keep them. A save is a draft save when `doc._status === 'draft'` and either
 * `previousDoc._status !== 'published'` (still unpublished) or the main row is still `published`
 * (the draft went to the versions table only). Unpublishing writes the main row, so it's logged.
 */
export const auditLogAfterChange: CollectionAfterChangeHook = async ({
  collection,
  doc,
  previousDoc,
  operation,
  req,
}) => {
  const slug = collection.slug
  if (!isCollectionSlug(slug, req.payload.collections)) {
    req.payload.logger.warn({ msg: 'audit log: unknown collection slug', slug })
    return doc
  }
  if (!isRecord(doc)) {
    return doc
  }

  if (typeof doc.id !== 'string' && typeof doc.id !== 'number') {
    return doc
  }
  const docId = String(doc.id)
  const userId = typeof req.user?.id === 'number' ? req.user.id : null
  const prev = isRecord(previousDoc) ? previousDoc : {}

  if (operation !== 'create' && doc._status === 'draft') {
    if (prev._status !== 'published') {
      req.payload.logger.debug({ msg: 'audit log: skipped draft save', slug, docId })
      return doc
    }
    const main: unknown = await req.payload.db.findOne({
      collection: slug,
      where: { id: { equals: doc.id } },
      req,
    })
    if (isRecord(main) && main._status === 'published') {
      req.payload.logger.debug({ msg: 'audit log: skipped draft save', slug, docId })
      return doc
    }
  }

  const fetched: unknown = await req.payload.findByID({
    collection: slug,
    id: doc.id,
    depth: 0,
    overrideAccess: true,
    showHiddenFields: true,
    draft: doc._status === 'draft',
    req,
  })
  const current = isRecord(fetched) ? fetched : doc
  if (!isRecord(fetched)) {
    req.payload.logger.warn({
      msg: 'audit log: failed to re-read saved doc, falling back to hook doc',
      slug,
      docId,
    })
  }

  if (operation === 'create') {
    await writeAuditLog(req, {
      operation: 'create',
      collectionSlug: slug,
      docId,
      tenant: tenantOf(slug, current),
      user: userId,
      changes: snapshot(current, collection.flattenedFields),
    })
    return doc
  }

  let base = prev
  if (
    Boolean(collection.versions?.drafts) &&
    doc._status === 'published' &&
    prev._status === 'draft'
  ) {
    const { docs } = await req.payload.findVersions({
      collection: slug,
      where: {
        and: [{ parent: { equals: doc.id } }, { 'version._status': { equals: 'published' } }],
      },
      sort: '-updatedAt',
      limit: 2,
      depth: 0,
      req,
      overrideAccess: true,
    })
    const lastPublished = docs[1]?.version
    if (isRecord(lastPublished)) {
      base = lastPublished
    }
  }

  let passwordChanged = false
  if (Boolean(collection.auth)) {
    const prevSalt = prev.salt
    const stored: unknown = await req.payload.db.findOne({
      collection: slug,
      where: { id: { equals: doc.id } },
      req,
    })
    const storedSalt = isRecord(stored) ? stored.salt : undefined
    if (typeof prevSalt === 'string' && typeof storedSalt === 'string' && prevSalt !== storedSalt) {
      passwordChanged = true
    }
  }

  const changes = diff(base, current, collection.flattenedFields, { passwordChanged })
  if (Object.keys(changes).length === 0) {
    req.payload.logger.debug({ msg: 'audit log: skipped no change', slug, docId })
    return doc
  }

  await writeAuditLog(req, {
    operation: 'update',
    collectionSlug: slug,
    docId,
    tenant: tenantOf(slug, current),
    user: userId,
    changes,
  })

  return doc
}

/** Logs deletes with the deleted doc (redacted), so it can be restored by hand. */
export const auditLogAfterDelete: CollectionAfterDeleteHook = async ({
  collection,
  doc,
  id,
  req,
}) => {
  const slug = collection.slug
  if (!isCollectionSlug(slug, req.payload.collections)) {
    req.payload.logger.warn({ msg: 'audit log: unknown collection slug', slug })
    return doc
  }
  if (!isRecord(doc)) {
    return doc
  }

  const userId = typeof req.user?.id === 'number' ? req.user.id : null
  // a deleted tenant can't be referenced (foreign key), so its own delete row has no tenant
  const tenant = slug === 'tenants' ? null : tenantOf(slug, doc)

  await writeAuditLog(req, {
    operation: 'delete',
    collectionSlug: slug,
    docId: String(id),
    user: userId,
    tenant,
    changes: snapshot(doc, collection.flattenedFields),
  })

  return doc
}

/**
 * Logs changes to globals (`audit-logs-settings`) as `update` rows in `audit-logs`.
 * Records collectionSlug = global slug, docId = global slug, no tenant, and the diff
 * of previousDoc vs doc on global.flattenedFields, so a super user shortening retention
 * (deleting logs) is itself logged.
 */
export const auditLogGlobalChange: GlobalAfterChangeHook = async ({
  doc,
  global,
  previousDoc,
  req,
}) => {
  if (!isRecord(doc) || !isRecord(previousDoc)) {
    return doc
  }

  const changes = diff(previousDoc, doc, global.flattenedFields, { passwordChanged: false })
  if (Object.keys(changes).length === 0) {
    req.payload.logger.debug({ msg: 'audit log: skipped no change', slug: global.slug })
    return doc
  }

  await writeAuditLog(req, {
    operation: 'update',
    collectionSlug: global.slug,
    docId: global.slug,
    tenant: null,
    user: typeof req.user?.id === 'number' ? req.user.id : null,
    changes,
  })

  return doc
}
