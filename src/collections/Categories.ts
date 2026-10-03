import type { CollectionConfig } from 'payload'

import { anyone } from '../access/anyone'
import { accessCheckResolver, hiddenResolver } from '@/common/utils/access'
import { slugField } from '@/fields/slug'
import { validateTenantSlugUniqueness } from '@/common/hooks/validateTenantSlugUniqueness'

export const Categories: CollectionConfig = {
  slug: 'categories',
  access: {
    create: accessCheckResolver('categories', 'create'),
    delete: accessCheckResolver('categories', 'delete'),
    read: anyone,
    update: accessCheckResolver('categories', 'update'),
  },
  admin: {
    useAsTitle: 'title',
    hidden: hiddenResolver('categories'),
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
