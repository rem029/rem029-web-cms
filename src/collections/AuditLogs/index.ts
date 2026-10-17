import type { CollectionConfig } from 'payload'

import { hiddenResolver } from '@/common/utils/access'

import { deleteAuditLogs, denyAuditLogWrites, readAuditLogs } from './utils/access'

/**
 * Who created, updated or deleted what (rem0002). Rows are written by the `addAuditLog` plugin's
 * hooks (`src/common/hooks/auditLog.ts`) and never edited: create and update are denied for
 * everyone through the api, delete is super-user only.
 */
export const AuditLogs: CollectionConfig = {
  slug: 'audit-logs',
  labels: { singular: 'Audit Log', plural: 'Audit Logs' },
  access: {
    read: readAuditLogs,
    create: denyAuditLogWrites,
    update: denyAuditLogWrites,
    delete: deleteAuditLogs,
  },
  admin: {
    group: 'Admin',
    useAsTitle: 'operation',
    defaultColumns: ['createdAt', 'user', 'operation', 'collectionSlug', 'docId', 'tenant'],
    // shown to super users and to rows whose profile shows audit-logs (tenant admins included)
    hidden: hiddenResolver('audit-logs'),
  },
  timestamps: true,
  indexes: [{ fields: ['collectionSlug', 'docId'] }],
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      maxDepth: 0,
      admin: { readOnly: true, description: 'Empty for seeds, migrations and jobs.' },
    },
    {
      name: 'operation',
      type: 'select',
      required: true,
      index: true,
      options: [
        { label: 'Create', value: 'create' },
        { label: 'Update', value: 'update' },
        { label: 'Delete', value: 'delete' },
        { label: 'Login', value: 'login' },
        { label: 'Logout', value: 'logout' },
        { label: 'Failed login', value: 'login_failed' },
      ],
      admin: { readOnly: true },
    },
    {
      name: 'collectionSlug',
      label: 'Collection',
      type: 'text',
      required: true,
      admin: { readOnly: true },
    },
    { name: 'docId', label: 'Document', type: 'text', required: true, admin: { readOnly: true } },
    {
      // our own field, not the multi-tenant plugin's: that one is required and filled from the
      // tenant cookie; rows about users and logins have no tenant
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      maxDepth: 0,
      index: true,
      admin: { readOnly: true },
    },
    { name: 'ip', label: 'IP address', type: 'text', admin: { readOnly: true } },
    {
      name: 'changes',
      type: 'json',
      admin: {
        readOnly: true,
        description:
          'Create and delete: the document. Update: the changed fields, from → to ("changed" for rich text, blocks and lists).',
      },
    },
  ],
}
