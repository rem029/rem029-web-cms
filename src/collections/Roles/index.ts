import { CollectionConfig } from 'payload'
import { validateAdmin } from './hooks/validateAdmin'
import { anyone } from '@/access/anyone'
import { authenticated } from '@/access/authenticated'

export const Roles: CollectionConfig = {
  slug: 'roles',
  admin: {
    useAsTitle: 'name',
    group: 'Admin',
    description: 'Manage user roles and permissions',
  },
  access: {
    read: anyone,
    update: authenticated,
    create: authenticated,
    delete: authenticated,
  },
  fields: [
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
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Unique identifier for this role (e.g., "admin", "editor", "contributor")',
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
              fields: [
                {
                  name: 'collection',
                  type: 'text',
                  required: true,
                  admin: {
                    description: 'Collection slug (e.g., "pages", "posts")',
                  },
                },
                {
                  name: 'canCreate',
                  type: 'checkbox',
                  defaultValue: false,
                  label: 'Can Create',
                  admin: {
                    description: 'Allow creating new items in this collection',
                  },
                },
                {
                  name: 'canRead',
                  type: 'checkbox',
                  defaultValue: true,
                  label: 'Can Read',
                  admin: {
                    description: 'Allow viewing items in this collection',
                  },
                },
                {
                  name: 'canUpdate',
                  type: 'checkbox',
                  defaultValue: false,
                  label: 'Can Update',
                  admin: {
                    description: 'Allow editing items in this collection',
                  },
                },
                {
                  name: 'canDelete',
                  type: 'checkbox',
                  defaultValue: false,
                  label: 'Can Delete',
                  admin: {
                    description: 'Allow deleting items in this collection',
                  },
                },
              ],
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
              fields: [
                {
                  name: 'global',
                  type: 'text',
                  admin: {
                    description: 'Global slug (e.g., "settings", "theme")',
                  },
                },
                {
                  name: 'canRead',
                  type: 'checkbox',
                  defaultValue: true,
                  label: 'Can Read',
                  admin: {
                    description: 'Allow viewing this global',
                  },
                },
                {
                  name: 'canUpdate',
                  type: 'checkbox',
                  defaultValue: false,
                  label: 'Can Update',
                  admin: {
                    description: 'Allow editing this global',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'isAdmin',
      type: 'checkbox',
      label: 'Is Admin Role',
      defaultValue: false,
      admin: {
        description: 'Admin roles bypass all permission checks (use carefully)',
      },
    },
  ],
  hooks: {
    beforeChange: [validateAdmin],
  },
}
