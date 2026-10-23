import type { CollectionConfig } from 'payload'

import { sameTenantFilter } from '@/common/fields/menuFields'
import { revalidateMenus, revalidateMenusDelete } from '@/common/hooks/revalidateMenus'
import { validateSameTenant } from '@/common/hooks/validateSameTenant'
import { accessCheckResolver, hiddenResolver } from '@/common/utils/access'
import { slugField } from '@/fields/slug'

import { setTableTenantFromMenu } from './hooks/setTableTenantFromMenu'
import { validateTableSlugUniqueness } from './hooks/validateTableSlugUniqueness'

/**
 * Tables (rem0018): the tables guests order from. Each table belongs to one menu (a menu is a
 * restaurant or an event, so "Table 1" of one restaurant is not "Table 1" of another: step 1c);
 * the menu's Ordering tab lists them (join) and prints their QR codes. Guests reach a table only
 * through the menu's server actions, so there is no public read.
 */
export const Tables: CollectionConfig = {
  slug: 'tables',
  labels: { singular: 'Table', plural: 'Tables' },
  access: {
    read: accessCheckResolver('tables', 'read'),
    create: accessCheckResolver('tables', 'create'),
    update: accessCheckResolver('tables', 'update'),
    delete: accessCheckResolver('tables', 'delete'),
  },
  admin: {
    group: 'Orders',
    useAsTitle: 'label',
    defaultColumns: ['label', 'menu', 'seats', 'isActive'],
    listSearchableFields: ['label', 'slug'],
    hidden: hiddenResolver('tables'),
  },
  defaultSort: 'sortOrder',
  indexes: [{ fields: ['menu', 'slug'], unique: true }],
  hooks: {
    beforeValidate: [
      setTableTenantFromMenu,
      validateTableSlugUniqueness,
      validateSameTenant([{ path: 'menu', collection: 'menus', label: 'menu' }]),
    ],
    // the guest menu's table picker lists them: same tag as the rest of the menu
    afterChange: [revalidateMenus],
    afterDelete: [revalidateMenusDelete],
  },
  fields: [
    {
      name: 'label',
      type: 'text',
      label: 'Label',
      required: true,
      // guests see it: "Table 5" / "طاولة 5"
      localized: true,
      admin: { description: 'What guests and staff call it, e.g. Table 5 or Terrace 2.' },
    },
    {
      name: 'menu',
      type: 'relationship',
      relationTo: 'menus',
      required: true,
      label: 'Menu',
      filterOptions: sameTenantFilter,
      admin: { description: 'The restaurant or event this table belongs to.' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'seats',
          type: 'number',
          label: 'Seats',
          min: 1,
          admin: { width: '50%', description: 'For staff only.' },
        },
        {
          name: 'sortOrder',
          type: 'number',
          label: 'Order',
          defaultValue: 0,
          admin: { width: '50%', description: 'Lower numbers come first in lists.' },
        },
      ],
    },
    ...slugField('label', { categoryPrefix: false }),
    {
      name: 'isActive',
      type: 'checkbox',
      label: 'Taking orders',
      defaultValue: true,
      admin: {
        position: 'sidebar',
        components: { Cell: '@/common/components/YesNoCell#YesNoCell' },
        description: 'Untick to stop orders from this table without deleting it.',
      },
    },
  ],
}
