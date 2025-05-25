import { Field } from 'payload'

export const permissionFields = (type: 'collections' | 'globals'): Field[] => {
  const defaultField: Field = {
    name: 'slug',
    type: 'text',
    required: true,
    admin: {
      description: 'Collection slug (e.g., "pages", "posts")',
    },
  }

  if (type === 'globals')
    return [
      defaultField,
      {
        name: 'read',
        type: 'checkbox',
        defaultValue: true,
        label: 'Can Read',
        admin: {
          description: 'Allow viewing items in this collection',
        },
      },
      {
        name: 'update',
        type: 'checkbox',
        defaultValue: false,
        label: 'Can Update',
        admin: {
          description: 'Allow editing items in this collection',
        },
      },
      {
        name: 'hidden',
        type: 'checkbox',
        defaultValue: false,
        label: 'Can Update',
        admin: {
          description: 'Allow editing items in this collection',
        },
      },
    ]

  return [
    defaultField,
    {
      name: 'create',
      type: 'checkbox',
      defaultValue: true,
      label: 'Can Create',
      admin: {
        description: 'Allow viewing items in this collection',
      },
    },
    {
      name: 'read',
      type: 'checkbox',
      defaultValue: true,
      label: 'Can Read',
      admin: {
        description: 'Allow viewing items in this collection',
      },
    },
    {
      name: 'update',
      type: 'checkbox',
      defaultValue: false,
      label: 'Can Update',
      admin: {
        description: 'Allow editing items in this collection',
      },
    },
    {
      name: 'delete',
      type: 'checkbox',
      defaultValue: false,
      label: 'Can Delete',
      admin: {
        description: 'Allow deleting items in this collection',
      },
    },
    {
      name: 'hidden',
      type: 'checkbox',
      defaultValue: false,
      label: 'Can Delete',
      admin: {
        description: 'Allow deleting items in this collection',
      },
    },
    {
      name: 'admin',
      type: 'checkbox',
      defaultValue: false,
      label: 'Can Delete',
      admin: {
        description: 'Allow deleting items in this collection',
      },
    },
  ]
}
