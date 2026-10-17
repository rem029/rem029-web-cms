import type { Access } from 'payload'

import { allowedTenantIds, isActiveSuperUser } from '@/common/utils/access'

/**
 * Read: super users see every row; everyone else sees the rows of the businesses where their row's
 * profile ticks `read` on `audit-logs`, tenant admins included (no logs by default: `rowAllows`
 * reads the profile for this slug even on tenant admin rows; only super users tick it,
 * `validateAccessRows`). Rows with no tenant (users, logins, deleted businesses) stay
 * super-user only: a user's row changes can name their other businesses. Disabled users get
 * nothing (the helpers deny them).
 */
export const readAuditLogs: Access = ({ req }) => {
  if (isActiveSuperUser(req.user)) return true
  const ids = allowedTenantIds(req, 'audit-logs', 'read')
  if (ids.length) return { tenant: { in: ids } }
  return false
}

/**
 * Rows are written only by the audit hooks (overrideAccess), never through the api, whatever a
 * profile ticks: a log anyone can write or edit proves nothing.
 */
export const denyAuditLogWrites: Access = () => false

/** Super users only, to clear rows by hand; a profile's `delete` doesn't grant it. */
export const deleteAuditLogs: Access = ({ req }) => isActiveSuperUser(req.user)
