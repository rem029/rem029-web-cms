import { Field } from 'payload'

export const createdUpdatedByFields: Field[] = [
  {
    name: 'createdBy',
    type: 'relationship',
    relationTo: 'users',
    access: {
      create: () => false,
      update: () => false,
    },
    admin: { position: 'sidebar', readOnly: true },
  },
  {
    name: 'updatedBy',
    type: 'relationship',
    relationTo: 'users',
    access: {
      create: () => false,
      update: () => false,
    },
    admin: {
      readOnly: true,
      position: 'sidebar',
    },
  },
]
