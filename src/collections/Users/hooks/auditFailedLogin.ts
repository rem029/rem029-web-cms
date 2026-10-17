import type { CollectionAfterErrorHook } from 'payload'
import { AuthenticationError, LockedAuth } from 'payload'

import { writeAuditLog } from '@/common/utils/auditLog'

const isRecord = (val: unknown): val is Record<string, unknown> =>
  typeof val === 'object' && val !== null && !Array.isArray(val)

/**
 * Audit log hook run after an error to record failed logins (rem0002 step 3).
 * Payload 3.44 throws these two errors only from login (and `blockDisabledLogin`); runs on REST/admin logins, not Local API ones. Stores the email tried and a reason, never the password.
 */
export const auditFailedLogin: CollectionAfterErrorHook = async ({ error, req }) => {
  if (!(error instanceof AuthenticationError || error instanceof LockedAuth)) {
    return
  }

  const rawEmail = req.data?.email
  const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase().slice(0, 254) : null

  const foundUser: unknown = email
    ? await req.payload.db.findOne({
        collection: 'users',
        where: { email: { equals: email } },
      })
    : null

  const user = isRecord(foundUser) ? foundUser : null
  const userId =
    user && (typeof user.id === 'number' || typeof user.id === 'string') ? user.id : null
  const docId = userId !== null ? String(userId) : 'unknown'
  const isDisabled = Boolean(user && user.is_disabled)

  const reason =
    error instanceof LockedAuth
      ? 'locked'
      : isDisabled
        ? 'disabled'
        : user
          ? 'wrong password'
          : 'unknown email'

  await writeAuditLog(req, {
    operation: 'login_failed',
    collectionSlug: 'users',
    docId,
    user: null,
    tenant: null,
    changes: { email, reason },
  })

  req.payload.logger.warn({ msg: 'failed login', email, reason })
}
