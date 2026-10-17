import type { CollectionConfig } from 'payload'

import { anyone } from '@/access/anyone'
import { menuTitleField } from '@/common/fields/menuFields'
import { accessCheckResolver, hiddenResolver } from '@/common/utils/access'
import { revalidateMenus, revalidateMenusDelete } from '@/common/hooks/revalidateMenus'

/**
 * Allergens (rem0017): picked on items, shown on the item view, used by the allergen filter.
 * Tenant-scoped; public read, writes from the profile.
 */
export const MenuAllergens: CollectionConfig = {
  slug: 'menu-allergens',
  labels: { singular: 'Allergen', plural: 'Allergens' },
  access: {
    read: anyone,
    create: accessCheckResolver('menu-allergens', 'create'),
    update: accessCheckResolver('menu-allergens', 'update'),
    delete: accessCheckResolver('menu-allergens', 'delete'),
  },
  hooks: { afterChange: [revalidateMenus], afterDelete: [revalidateMenusDelete] },
  admin: {
    group: 'Menu',
    useAsTitle: 'title',
    defaultColumns: ['title', 'updatedAt'],
    hidden: hiddenResolver('menu-allergens'),
  },
  fields: [
    menuTitleField,
    {
      name: 'description',
      type: 'textarea',
      label: 'Description',
      localized: true,
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      label: 'Icon',
    },
  ],
}
