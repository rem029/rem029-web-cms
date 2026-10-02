import type { CollectionConfig } from 'payload'

import { anyone } from '../access/anyone'
import { authenticated } from '../access/authenticated'
import { accessCheckResolver } from '@/utilities/access'
import { slugField } from '@/fields/slug'
import { validateTenantSlugUniqueness } from '@/common/hooks/validateTenantSlugUniqueness'

export const Categories: CollectionConfig = {
  slug: 'categories',
  access: {
    create: accessCheckResolver('categories', 'canCreate'),
    delete: accessCheckResolver('categories', 'canDelete'),
    read: anyone,
    update: accessCheckResolver('categories', 'canUpdate'),
  },
  admin: {
    useAsTitle: 'title',
  },
  indexes: [
    {
      fields: ['tenant', 'slug'],
      unique: true,
    },
  ],
  hooks: {
    beforeValidate: [validateTenantSlugUniqueness('categories', 'category')],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    ...slugField(),
  ],
}
