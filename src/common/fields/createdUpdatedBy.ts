import type { FieldHook, RelationshipField } from 'payload'

import { isActiveSuperUser } from '@/common/utils/access'
// a relationship value (id or populated doc) → numeric id; works for any collection
import { extractTenantId as relationId } from '@/common/utils/tenantCollections'

const CACHE_KEY = 'readableAuditUsers'

const readableCache = (context: Record<string, unknown>): Map<number, boolean> => {
  const cached = context[CACHE_KEY]
  if (cached instanceof Map) return cached
  const created = new Map<number, boolean>()
  context[CACHE_KEY] = created
  return created
}

/**
 * Empties `createdBy` / `updatedBy` for signed-in readers who can't read that user (a super user
 * seen by a member, someone from another business), so the admin hides the field instead of
 * showing an id or a blank, and the API doesn't hand out the id. Anonymous readers never get here
 * (the field's read access strips it). Internal reads (overrideAccess) and super users keep it.
 * Lookups are cached per request, so a list view asks once per user.
 */
const hideUnreadableUser: FieldHook = async ({ value, req, overrideAccess, context }) => {
  const userId = relationId(value)
  if (userId === null || overrideAccess || !req.user || isActiveSuperUser(req.user)) return value

  const cache = readableCache(context)
  let readable = cache.get(userId)
  if (readable === undefined) {
    const { totalDocs } = await req.payload.count({
      collection: 'users',
      where: { id: { equals: userId } },
      overrideAccess: false,
      user: req.user,
      req,
    })
    readable = totalDocs > 0
    cache.set(userId, readable)
  }

  if (readable) return value
  req.payload.logger.debug({
    msg: 'audit field: user not readable, hidden',
    userId: req.user.id,
    targetId: userId,
  })
  return null
}

const auditField = (name: 'createdBy' | 'updatedBy'): RelationshipField => ({
  name,
  type: 'relationship',
  relationTo: 'users',
  // id only: populating a user populates its own createdBy, and so on
  maxDepth: 0,
  access: {
    // anonymous api readers get neither field; internal reads (overrideAccess, the frontend)
    // skip field access
    read: ({ req }) => Boolean(req.user),
    create: () => false,
    update: () => false,
  },
  hooks: { afterRead: [hideUnreadableUser] },
  admin: {
    position: 'sidebar',
    readOnly: true,
    allowCreate: false,
    allowEdit: false,
    // hidden when empty: docs from before the field, or a user the reader can't read
    condition: (_data, siblingData) => relationId(siblingData?.[name]) !== null,
  },
})

/** Added to every collection in `createdUpdatedByCollections` by the `addCreatedUpdatedBy` plugin. */
export const createdUpdatedByFields: RelationshipField[] = [
  auditField('createdBy'),
  auditField('updatedBy'),
]
