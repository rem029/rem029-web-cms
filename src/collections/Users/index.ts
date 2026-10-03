import type { Access, CollectionConfig } from 'payload'

import {
  accessCheckResolver,
  adminAccess,
  hasAccess,
  hiddenResolver,
  isSuperUserField,
} from '@/common/utils/access'
import { assignDefaultAccess } from './hooks/assignDefaultAccess'
import { setupFirstUser } from './hooks/setupFirstUser'

const selfOrPermission =
  (op: 'read' | 'update'): Access =>
  ({ req }) => {
    if (!req.user) return false
    if (hasAccess(req, 'users', op)) return true
    return { id: { equals: req.user.id } }
  }

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    admin: adminAccess,
    create: accessCheckResolver('users', 'create'),
    delete: accessCheckResolver('users', 'delete'),
    read: selfOrPermission('read'),
    update: selfOrPermission('update'),
  },
  admin: {
    defaultColumns: ['name', 'email'],
    useAsTitle: 'name',
    group: 'Admin',
    hidden: hiddenResolver('users'),
  },
  auth: true,
  fields: [
    {
      name: 'name',
      type: 'text',
    },
    {
      name: 'super_user',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'A super user has full access to all collections and settings.',
        position: 'sidebar',
      },
    },
    {
      name: 'access',
      type: 'relationship',
      relationTo: 'users-access',
      required: false,
      access: {
        create: isSuperUserField,
        update: isSuperUserField,
      },
      admin: {
        condition: (data) => !data?.super_user,
        description: 'What this user can see and do. Super users bypass it.',
      },
    },
  ],
  hooks: {
    beforeChange: [setupFirstUser, assignDefaultAccess],
  },
  timestamps: true,
}
