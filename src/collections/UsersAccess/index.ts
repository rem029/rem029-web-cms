import type { CollectionConfig } from 'payload'
import { hiddenResolver } from '@/common/utils/access'
import { createdUpdatedByFields } from '@/fields/createdUpdatedByFields'
import { setCreatedUpdatedByCollection } from '@/hooks/setCreatedUpdatedBy'
import { defaultAccessRows } from './hooks/defaultAccessRows'
import { businessLabel } from './hooks/businessLabel'
import { enforceProfileTenant } from './hooks/enforceProfileTenant'
import { createProfile, deleteProfile, readProfiles, updateProfile } from './utils/access'
import { validateAccessRows, validateProfileSlug } from './utils/validateAccessRows'

/**
 * Access profiles for role-based permissions (rem0001).
 * Tenant-scoped since rem0001 phase 5; profiles on the `admin` tenant are platform templates.
 */
export const UsersAccess: CollectionConfig = {
  slug: 'users-access',
  labels: {
    singular: 'Access',
    plural: 'Access',
  },
  indexes: [
    {
      fields: ['tenant', 'slug'],
      unique: true,
    },
    {
      fields: ['tenant', 'name'],
      unique: true,
    },
  ],
  admin: {
    group: 'Admin',
    useAsTitle: 'name',
    defaultColumns: ['name', 'business', 'slug', 'description'],
    hidden: hiddenResolver('users-access'),
  },
  access: {
    read: readProfiles,
    create: createProfile,
    update: updateProfile,
    delete: deleteProfile,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      validate: validateProfileSlug,
      admin: {
        description: 'Identifies the profile in code, e.g. "default". Lowercase kebab-case.',
      },
    },
    {
      // not stored: which business the profile belongs to, for the list (profiles share names
      // across businesses) and the sidebar; the plugin's tenant field is hidden in the admin
      name: 'business',
      type: 'text',
      label: 'Business',
      virtual: true,
      access: { create: () => false, update: () => false },
      hooks: { afterRead: [businessLabel] },
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'access',
      type: 'array',
      validate: validateAccessRows,
      admin: {
        components: {
          RowLabel: '@/collections/UsersAccess/components/AccessRowLabel#AccessRowLabel',
        },
      },
      fields: [
        {
          name: 'slug',
          type: 'select',
          required: true,
          options: [],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'hidden',
              type: 'checkbox',
              defaultValue: false,
            },
            {
              name: 'read',
              type: 'checkbox',
              defaultValue: false,
            },
            {
              name: 'create',
              type: 'checkbox',
              defaultValue: false,
            },
            {
              name: 'update',
              type: 'checkbox',
              defaultValue: false,
            },
            {
              name: 'delete',
              type: 'checkbox',
              defaultValue: false,
            },
            {
              name: 'admin',
              type: 'checkbox',
              defaultValue: false,
              admin: {
                condition: (_, siblingData) => siblingData?.slug === 'users',
                description:
                  'Can open the admin panel. On this row only Admin and Hidden apply: only super users manage other users.',
              },
            },
            {
              name: 'access',
              type: 'checkbox',
              defaultValue: false,
              label: 'API access',
            },
          ],
        },
      ],
    },
    ...createdUpdatedByFields,
  ],
  hooks: {
    beforeValidate: [defaultAccessRows],
    beforeChange: [enforceProfileTenant, setCreatedUpdatedByCollection],
  },
  timestamps: true,
}
