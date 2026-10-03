import type { CollectionConfig } from 'payload'

import {
  adminAccess,
  hiddenResolver,
  isSuperUser,
  isSuperUserField,
  showToSuperUsers,
} from '@/common/utils/access'
import {
  canCreateUserEmail,
  canCreatePassword,
  isSelfOrSuperUserField,
  createUsers,
  deleteUsers,
  readUsers,
  updateUsers,
} from './utils/access'
import { logoutEndpoint } from './endpoints/logout'
import { assignDefaultAccess } from './hooks/assignDefaultAccess'
import { blockDisabledLogin } from './hooks/blockDisabledLogin'
import { guardSensitiveFields } from './hooks/guardSensitiveFields'
import { guardTenantRows } from './hooks/guardTenantRows'
import { guardTenantAdminDelete } from './hooks/guardTenantAdminDelete'
import { protectLastSuperUser } from './hooks/protectLastSuperUser'
import { protectLastSuperUserDelete } from './hooks/protectLastSuperUserDelete'
import { setupFirstUser } from './hooks/setupFirstUser'

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    admin: adminAccess,
    create: createUsers,
    delete: deleteUsers,
    read: readUsers,
    // the button is hidden for anyone who can't use it; tenant admins don't unlock accounts
    // (an account can belong to other tenants)
    unlock: isSuperUser,
    update: updateUsers,
  },
  admin: {
    defaultColumns: ['name', 'email'],
    useAsTitle: 'name',
    group: 'Admin',
    hidden: hiddenResolver('users'),
  },
  auth: true,
  // replaces Payload's logout, which can wipe `tenants` rows when two run at once (see the file)
  endpoints: [logoutEndpoint],
  fields: [
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
      index: true,
      access: {
        create: canCreateUserEmail,
        update: isSuperUserField,
      },
    },
    {
      // not stored: sets access on Payload's built-in password, which the admin reads to show
      // "Change Password" only to those allowed to use it
      name: 'password',
      type: 'text',
      virtual: true,
      access: { read: () => true, create: canCreatePassword, update: isSelfOrSuperUserField },
      admin: { hidden: true },
    },
    {
      // read-only on other users for tenant admins (a user can belong to other tenants)
      name: 'name',
      type: 'text',
      access: { update: isSelfOrSuperUserField },
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
    beforeOperation: [guardSensitiveFields, guardTenantRows],
    beforeChange: [setupFirstUser, assignDefaultAccess, protectLastSuperUser],
    beforeDelete: [guardTenantAdminDelete, protectLastSuperUserDelete],
    beforeLogin: [blockDisabledLogin],
  },
  timestamps: true,
}
