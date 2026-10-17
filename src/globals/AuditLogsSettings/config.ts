import type { GlobalConfig } from 'payload'

import { auditLogGlobalChange } from '@/common/hooks/auditLog'
import { isActiveSuperUser } from '@/common/utils/access'

/**
 * Audit log settings (rem0002): how long logs are kept. A global, not per tenant: retention is a
 * platform rule set by super users, the same for every business. Changes are logged
 * (`auditLogGlobalChange`), so shortening retention to delete logs leaves a trace.
 */
export const AuditLogsSettings: GlobalConfig = {
  slug: 'audit-logs-settings',
  label: 'Audit Log Settings',
  admin: {
    group: 'Admin',
    hidden: ({ user }) => !isActiveSuperUser(user),
  },
  access: {
    read: ({ req }) => isActiveSuperUser(req.user),
    update: ({ req }) => isActiveSuperUser(req.user),
  },
  fields: [
    {
      name: 'retentionMonths',
      type: 'number',
      required: true,
      min: 1,
      max: 120,
      defaultValue: 12,
      label: 'Keep logs for (months)',
      admin: {
        description: 'Logs older than this are deleted every night.',
      },
      validate: (value: unknown) => {
        if (typeof value !== 'number' || Number.isNaN(value)) {
          return 'Retention months must be a number'
        }
        if (!Number.isInteger(value)) {
          return 'Retention months must be a whole number'
        }
        if (value < 1) {
          return 'Retention months must be at least 1'
        }
        if (value > 120) {
          return 'Retention months must be at most 120'
        }
        return true
      },
    },
  ],
  hooks: {
    afterChange: [auditLogGlobalChange],
  },
}
