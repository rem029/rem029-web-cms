import type { Access, CollectionConfig } from 'payload'

import {
  adminAccess,
  hiddenResolver,
  isActiveSuperUser,
  isDisabledUser,
  isSuperUser,
  isSuperUserField,
  showToSuperUsers,
} from '@/common/utils/access'
import { assignDefaultAccess } from './hooks/assignDefaultAccess'
import { blockDisabledLogin } from './hooks/blockDisabledLogin'
import { guardSensitiveFields } from './hooks/guardSensitiveFields'
import { protectLastSuperUser } from './hooks/protectLastSuperUser'
import { protectLastSuperUserDelete } from './hooks/protectLastSuperUserDelete'
import { setupFirstUser } from './hooks/setupFirstUser'

const selfOrSuperUser: Access = ({ req }) => {
  if (!req.user) return false
  if (isDisabledUser(req.user)) return false
  if (isActiveSuperUser(req.user)) return true
  return { id: { equals: req.user.id } }
}

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    admin: adminAccess,
    create: isSuperUser,
    delete: isSuperUser,
    read: selfOrSuperUser,
    update: selfOrSuperUser,
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
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
      index: true,
      access: {
        create: isSuperUserField,
        update: isSuperUserField,
      },
    },
    {
      name: 'name',
      type: 'text',
    },
    {
      name: 'super_user',
      type: 'checkbox',
      defaultValue: false,
      access: {
        create: isSuperUserField,
        update: isSuperUserField,
      },
      admin: {
        condition: showToSuperUsers,
        description: 'A super user has full access to all collections and settings.',
        position: 'sidebar',
      },
    },
    {
      name: 'is_disabled',
      type: 'checkbox',
      defaultValue: false,
      access: {
        read: isSuperUserField,
        create: isSuperUserField,
        update: isSuperUserField,
      },
      admin: {
        description: "A disabled user can't log in, and any open session gets no access.",
        position: 'sidebar',
      },
    },
  ],
  hooks: {
    beforeOperation: [guardSensitiveFields],
    beforeChange: [setupFirstUser, assignDefaultAccess, protectLastSuperUser],
    beforeDelete: [protectLastSuperUserDelete],
    beforeLogin: [blockDisabledLogin],
  },
  timestamps: true,
}
