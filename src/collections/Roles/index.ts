import { CollectionConfig, PayloadRequest } from 'payload'
import { validateAdmin, validateRoleShouldHaveOneAdmin } from './hooks/validateAdmin'
import { permissionFields } from './fields'
import { getConfigAccessCollection } from '@/utilities/configAccess'

const getDefaultValue = (req: PayloadRequest, type: 'collections' | 'globals') => {
  return Object.keys(req.payload[type]).map((key) => ({
    slug: key,
    read: true,
    update: false,
    hidden: false,
    create: false,
    admin: false,
    delete: false,
  }))
}

export const Roles: CollectionConfig = {
  slug: 'roles',
  access: getConfigAccessCollection('roles'),
  admin: {
    useAsTitle: 'name',
    group: 'Admin',
    description: 'Manage user roles and permissions',
  },
  fields: [
    {
      name: 'isAdmin',
      type: 'checkbox',
      label: 'Is Admin Role',
      defaultValue: false,
      admin: {
        description: 'Admin roles bypass all permission checks (use carefully)',
      },
    },
    {
      name: 'name',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Display name for this role',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Brief description of what this role is for',
      },
    },
    {
      type: 'tabs',
      label: 'Permissions',
      tabs: [
        {
          name: 'collections',
          label: 'Collection',
          fields: [
            {
              name: 'permissions',
              type: 'array',
              label: 'Permissions',
              interfaceName: 'RoleCollectionPermissions',
              admin: {
                description: 'Set permissions for each collection',
                components: {
                  RowLabel:
                    '@/collections/Roles/components/CollectionsRowLabel#CollectionsRowLabel',
                },
              },
              defaultValue: ({ req }) => getDefaultValue(req, 'collections'),
              fields: permissionFields('collections'),
            },
          ],
        },
        {
          name: 'globals',
          label: 'Globals',
          fields: [
            {
              name: 'permissions',
              type: 'array',
              label: 'Permissions',
              interfaceName: 'RoleGlobalPermissions',
              admin: {
                description: 'Set permissions for each global',
                components: {
                  RowLabel: '@/collections/Roles/components/GlobalsRowLabel#GlobalsRowLabel',
                },
              },
              defaultValue: ({ req }) => getDefaultValue(req, 'globals'),
              fields: permissionFields('globals'),
            },
          ],
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [validateRoleShouldHaveOneAdmin, validateAdmin],
  },
}
