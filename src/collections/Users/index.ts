import type { CollectionConfig } from 'payload'

import { authenticated } from '../../access/authenticated'
import { accessCheckResolver } from '@/utilities/access'
import { isSuperUserField } from '@/common/utils/access'
import { setupFirstUser } from './hooks/setupFirstUser'

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    admin: authenticated,
    create: accessCheckResolver('users', 'canCreate'),
    delete: accessCheckResolver('users', 'canDelete'),
    read: accessCheckResolver('users', 'canRead', {
      fallbackAccess: false,
      refineAccess: async (hasAccess, _, req) => {
        if (hasAccess) return true
        if (req.user) return { id: { equals: req.user.id } }
        return false
      },
    }),
    update: accessCheckResolver('users', 'canUpdate', {
      fallbackAccess: false,
      refineAccess: async (hasAccess, _, req) => {
        if (hasAccess) return true
        if (req.user) return { id: { equals: req.user.id } }
        return false
      },
    }),
  },
  admin: {
    defaultColumns: ['name', 'email'],
    useAsTitle: 'name',
    group: 'Admin',
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
      name: 'role',
      type: 'relationship',
      relationTo: 'roles',
      required: false,
      admin: {
        condition: (data) => !data?.super_user,
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
      // Note: Not used by access checks yet (rem0001 phase 2).
      admin: {
        condition: (data) => !data?.super_user,
        description: 'What this user can see and do. Super users bypass it.',
      },
    },
  ],
  hooks: {
    beforeChange: [setupFirstUser],
  },
  timestamps: true,
}
