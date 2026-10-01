import { CollectionConfig } from 'payload'
import { User } from '@/payload-types'
import { AccessAdmin, accessCheckResolver, accessHiddenBySlug } from '@/utilities/access'

const SLUG = 'audit-logs'
const AuditLogs: CollectionConfig = {
  slug: SLUG,
  labels: {
    singular: 'Audit Log',
    plural: 'Audit Logs',
  },
  admin: {
    useAsTitle: 'operation',
    group: 'Admin',
    hidden: (u) => accessHiddenBySlug(u.user as unknown as User, SLUG) as boolean,
    defaultColumns: ['collectionSlug', 'type', 'entityId', 'operation', 'user', 'ip', 'createdAt'],
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: false,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'collectionSlug',
      type: 'text',
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'type',
      type: 'select',
      defaultValue: 'collection',
      required: true,
      options: [
        { label: 'Collection', value: 'collection' },
        { label: 'Global', value: 'global' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'entityId',
      type: 'text',
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'operation',
      type: 'select',
      required: true,
      options: [
        { label: 'Create', value: 'create' },
        { label: 'Update', value: 'update' },
        { label: 'Delete', value: 'delete' },
        { label: 'Login', value: 'login' },
        { label: 'Logout', value: 'logout' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'ip',
      type: 'text',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'data',
      type: 'json',
      admin: {
        description: 'Captured data at the time of operation',
      },
    },
  ],
  access: {
    admin: accessCheckResolver(SLUG, 'admin', { fallbackAccess: false }) as AccessAdmin,
    read: accessCheckResolver(SLUG, 'read', { fallbackAccess: false }),
    create: () => false,
    update: () => false,
    delete: accessCheckResolver(SLUG, 'delete', { fallbackAccess: false }),
  },
  timestamps: true,
}

export default AuditLogs