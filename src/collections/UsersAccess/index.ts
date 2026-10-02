import type { CollectionConfig } from 'payload'
import { isSuperUser } from '@/common/utils/access'
import { createdUpdatedByFields } from '@/fields/createdUpdatedByFields'
import { setCreatedUpdatedByCollection } from '@/hooks/setCreatedUpdatedBy'
import { defaultAccessRows } from './hooks/defaultAccessRows'
import { validateAccessRows, validateProfileSlug } from './utils/validateAccessRows'

/**
 * Profiles are platform-wide (not tenant-scoped) until rem0001 phase 5 makes them tenant-scoped.
 */
export const UsersAccess: CollectionConfig = {
  slug: 'users-access',
  labels: {
    singular: 'Access',
    plural: 'Access',
  },
  admin: {
    group: 'Admin',
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'description'],
  },
  access: {
    read: isSuperUser,
    create: isSuperUser,
    update: isSuperUser,
    delete: isSuperUser,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      validate: validateProfileSlug,
      admin: {
        description: 'Identifies the profile in code, e.g. "default". Lowercase kebab-case.',
      },
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
                description: 'Can open the admin panel',
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
    beforeChange: [setCreatedUpdatedByCollection],
  },
  timestamps: true,
}
