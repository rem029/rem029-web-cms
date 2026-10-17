import type { CollectionAfterLoginHook } from 'payload'

import { writeAuditLog } from '@/common/utils/auditLog'
import type { User } from '@/payload-types'

/**
 * Audit log hook run after a successful user login (rem0002 step 3).
 * Writes a `login` row (never the token).
 */
export const auditLogin: CollectionAfterLoginHook<User> = async ({ req, user }) => {
  await writeAuditLog(req, {
    operation: 'login',
    collectionSlug: 'users',
    docId: String(user.id),
    user: user.id,
    tenant: null,
  })
  return user
}
