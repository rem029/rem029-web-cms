import type { CollectionConfig } from 'payload'

import { availabilityField, menuTitleField, sameTenantFilter } from '@/common/fields/menuFields'
import { validateSameTenant } from '@/common/hooks/validateSameTenant'
import { validateTenantSlugUniqueness } from '@/common/hooks/validateTenantSlugUniqueness'
import { accessCheckResolver, hiddenResolver } from '@/common/utils/access'
import { revalidateMenus, revalidateMenusDelete } from '@/common/hooks/revalidateMenus'
import { slugField } from '@/fields/slug'

import { readMenuItems } from './utils/access'

/**
 * Menu items (rem0017): the tenant's catalog. One price and one category per item; menus pick
 * items (phase 2). No drafts: "Show on menus" (`isActive`) switches an item off everywhere.
 */
export const MenuItems: CollectionConfig = {
  slug: 'menu-items',
  labels: { singular: 'Item', plural: 'Items' },
  access: {
    read: readMenuItems,
    create: accessCheckResolver('menu-items', 'create'),
    update: accessCheckResolver('menu-items', 'update'),
    delete: accessCheckResolver('menu-items', 'delete'),
  },
  admin: {
    group: 'Menu',
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'price', 'inStock', 'isActive'],
    listSearchableFields: ['title', 'slug'],
    hidden: hiddenResolver('menu-items'),
  },
  indexes: [{ fields: ['tenant', 'slug'], unique: true }],
  hooks: {
    // a menu shows its items: their changes revalidate the tenant's menu pages
    afterChange: [revalidateMenus],
    afterDelete: [revalidateMenusDelete],
    beforeValidate: [
      validateTenantSlugUniqueness('menu-items', 'item'),
      validateSameTenant([
        { path: 'category', collection: 'menu-categories', label: 'category' },
        { path: 'allergens', collection: 'menu-allergens', label: 'allergen' },
        { path: 'tags', collection: 'menu-tags', label: 'tag' },
      ]),
    ],
  },
  fields: [
    {
      type: 'row',
      fields: [
        { ...menuTitleField, admin: { width: '60%' } },
        {
          name: 'price',
          type: 'number',
          label: 'Price',
          required: true,
          min: 0,
          admin: {
            // implementation: components: { Cell: '@/collections/MenuItems/components/PriceCell#PriceCell' }
            width: '40%',
            step: 0.01,
            description: 'In the currency set in Settings.',
          },
        },
      ],
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'menu-categories',
      label: 'Category',
      filterOptions: sameTenantFilter,
      admin: { description: 'Items without a category show under "Other".' },
    },
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
      label: 'Photo',
    },
    {
      type: 'row',
      fields: [
        {
          name: 'allergens',
          type: 'relationship',
          relationTo: 'menu-allergens',
          hasMany: true,
          label: 'Allergens',
          filterOptions: sameTenantFilter,
          admin: { width: '50%' },
        },
        {
          name: 'tags',
          type: 'relationship',
          relationTo: 'menu-tags',
          hasMany: true,
          label: 'Tags',
          filterOptions: sameTenantFilter,
          admin: { width: '50%' },
        },
      ],
    },
    availabilityField,
    {
      name: 'modifierGroups',
      type: 'array',
      label: 'Options',
      labels: { singular: 'Option group', plural: 'Option groups' },
      admin: {
        // implementation: components: { RowLabel: '@/collections/MenuItems/components/OptionGroupRowLabel#OptionGroupRowLabel' }
        description: 'Choices guests see on the item, e.g. Size (Small, Large) or Milk (Oat, Soy).',
        initCollapsed: true,
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'name',
              type: 'text',
              label: 'Group name',
              required: true,
              localized: true,
              admin: { width: '50%' },
            },
            {
              name: 'inputType',
              type: 'select',
              label: 'Guests pick',
              required: true,
              defaultValue: 'checkbox',
              options: [
                { label: 'Any number', value: 'checkbox' },
                { label: 'Exactly one', value: 'radio' },
              ],
              admin: { width: '30%' },
            },
            {
              name: 'required',
              type: 'checkbox',
              label: 'Required',
              defaultValue: false,
              admin: { width: '20%' },
            },
          ],
        },
        {
          name: 'options',
          type: 'array',
          label: 'Choices',
          required: true,
          minRows: 1,
          fields: [
            {
              name: 'label',
              type: 'text',
              label: 'Choice',
              required: true,
              localized: true,
            },
          ],
        },
      ],
    },
    ...slugField('title', { categoryPrefix: false }),
    {
      name: 'inStock',
      type: 'checkbox',
      label: 'In stock',
      defaultValue: true,
      admin: {
        // implementation: components: { Cell: '@/collections/MenuItems/components/YesNoCell#YesNoCell' }
        position: 'sidebar',
        description: 'Out of stock items stay on the menu, marked as unavailable.',
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      label: 'Show on menus',
      defaultValue: true,
      admin: {
        // implementation: components: { Cell: '@/collections/MenuItems/components/YesNoCell#YesNoCell' }
        position: 'sidebar',
        description: 'Untick to hide this item from every menu without deleting it.',
      },
    },
  ],
}
