import type { CollectionConfig } from 'payload'

import { anyone } from '@/access/anyone'
import { menuTitleField } from '@/common/fields/menuFields'
import { validateTenantSlugUniqueness } from '@/common/hooks/validateTenantSlugUniqueness'
import { accessCheckResolver, hiddenResolver } from '@/common/utils/access'
import { slugField } from '@/fields/slug'

/**
 * Menu categories (rem0017): the sections a guest menu is grouped in ("Starters", "Drinks").
 * Tenant-scoped; public read (the menu page shows them), writes from the profile.
 */
export const MenuCategories: CollectionConfig = {
  slug: 'menu-categories',
  labels: { singular: 'Category', plural: 'Categories' },
  access: {
    read: anyone,
    create: accessCheckResolver('menu-categories', 'create'),
    update: accessCheckResolver('menu-categories', 'update'),
    delete: accessCheckResolver('menu-categories', 'delete'),
  },
  admin: {
    group: 'Menu',
    useAsTitle: 'title',
    defaultColumns: ['title', 'sortOrder', 'updatedAt'],
    hidden: hiddenResolver('menu-categories'),
  },
  defaultSort: 'sortOrder',
  indexes: [{ fields: ['tenant', 'slug'], unique: true }],
  hooks: {
    beforeValidate: [validateTenantSlugUniqueness('menu-categories', 'category')],
  },
  fields: [
    menuTitleField,
    ...slugField(),
    {
      name: 'sortOrder',
      type: 'number',
      label: 'Order',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
        description: 'Lower numbers come first on the menu.',
      },
    },
  ],
}
