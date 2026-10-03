import type { Field, FieldHook } from 'payload'

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
 * Empties `createdBy` / `updatedBy` for readers who can't read that user (a super user, someone
 * from another business), so the admin hides the field instead of showing an id or a blank, and
 * the API doesn't hand out the id. Internal reads (overrideAccess) and super users keep it.
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

const auditField = (name: 'createdBy' | 'updatedBy'): Field => ({
  name,
  type: 'relationship',
  relationTo: 'users',
  access: {
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

export const createdUpdatedByFields: Field[] = [auditField('createdBy'), auditField('updatedBy')]
