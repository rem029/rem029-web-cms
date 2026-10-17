import type { CollectionConfig } from 'payload'

import { anyone } from '@/access/anyone'
import { menuTitleField } from '@/common/fields/menuFields'
import { accessCheckResolver, hiddenResolver } from '@/common/utils/access'

/**
 * Item tags (rem0017): short labels on items ("Vegan", "Spicy", "New"), shown on the menu.
 * Tenant-scoped; public read, writes from the profile.
 */
export const MenuTags: CollectionConfig = {
  slug: 'menu-tags',
  labels: { singular: 'Tag', plural: 'Tags' },
  access: {
    read: anyone,
    create: accessCheckResolver('menu-tags', 'create'),
    update: accessCheckResolver('menu-tags', 'update'),
    delete: accessCheckResolver('menu-tags', 'delete'),
  },
  admin: {
    group: 'Menu',
    useAsTitle: 'title',
    defaultColumns: ['title', 'updatedAt'],
    hidden: hiddenResolver('menu-tags'),
  },
  fields: [menuTitleField],
}
