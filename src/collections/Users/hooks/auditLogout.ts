import type { CollectionAfterLogoutHook } from 'payload'

import { writeAuditLog } from '@/common/utils/auditLog'

/**
 * Audit log hook run after user logout (rem0002 step 3).
 * Writes a `logout` row; called by our logout endpoint inside its transaction.
 */
export const auditLogout: CollectionAfterLogoutHook = async ({ req }) => {
  if (!req.user) {
    req.payload.logger.debug({ msg: 'auditLogout: no user on request' })
    return
  }
  await writeAuditLog(req, {
    operation: 'logout',
    collectionSlug: 'users',
    docId: String(req.user.id),
    user: req.user.id,
    tenant: null,
  })
}
