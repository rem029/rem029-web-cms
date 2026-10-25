import type { CollectionConfig } from 'payload'

import { ORDER_FLOWS } from '@/collections/Menus/fields/ordering'
import { sameTenantFilter } from '@/common/fields/menuFields'
import { validateSameTenant } from '@/common/hooks/validateSameTenant'
import { businessLabel } from '@/common/hooks/businessLabel'
import { accessCheckResolver, hiddenResolver, isActiveSuperUser } from '@/common/utils/access'
import { extractTenantId } from '@/common/utils/tenantCollections'

import { assignOrderNumber } from './hooks/assignOrderNumber'
import { snapshotItems } from './hooks/snapshotItems'
import { ordersAccess } from './utils/access'
import { ORDER_SOURCES, ORDER_STATUSES, ORDER_TYPES, PAYMENT_STATUSES } from './utils/statuses'

// computed by the hooks: editors see them, nobody types them
const computed = { readOnly: true } as const

// amounts are minor units (1800); these show them as money in the order's currency ("$18.00")
const money = {
  Field: '@/collections/Orders/components/MoneyField#MoneyField',
  Cell: '@/collections/Orders/components/MoneyCell#MoneyCell',
}

/**
 * Orders (rem0018 phase 1 step 3a): what a guest (phase 3) or the POS (rem0022) ordered from one
 * menu. Prices, titles and the menu's flow are snapshotted when the order is placed, so later
 * catalog or menu changes never change it; amounts are minor units (`src/common/utils/money.ts`).
 * No public access: guests go through server actions. Staff read and update the orders of the
 * menus that list them (`ordersAccess`). Status moves, their timestamps and live updates: 3b.
 */
export const Orders: CollectionConfig = {
  slug: 'orders',
  labels: { singular: 'Order', plural: 'Orders' },
  access: {
    read: ordersAccess('read'),
    // guests and the POS create through server code (overrideAccess); in the admin, the profile
    create: accessCheckResolver('orders', 'create'),
    update: ordersAccess('update'),
    delete: accessCheckResolver('orders', 'delete'),
  },
  admin: {
    group: 'Orders',
    useAsTitle: 'orderNumber',
    // `business` shows to super users only (its read access): the only ones who see several
    defaultColumns: ['orderNumber', 'business', 'table', 'status', 'paymentStatus', 'total', 'createdAt'],
    hidden: hiddenResolver('orders'),
  },
  defaultSort: '-createdAt',
  hooks: {
    beforeValidate: [
      validateSameTenant([
        { path: 'menu', collection: 'menus', label: 'menu' },
        { path: 'table', collection: 'tables', label: 'table' },
      ]),
    ],
    // snapshot first: the number is taken last, so a refused order never uses one
    beforeChange: [snapshotItems, assignOrderNumber],
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'orderNumber',
          type: 'number',
          label: 'Number',
          admin: { ...computed, width: '33%', description: 'Restarts every business day.' },
        },
        {
          name: 'orderDate',
          type: 'text',
          label: 'Business day',
          index: true,
          admin: { ...computed, width: '33%' },
        },
        {
          name: 'status',
          type: 'select',
          label: 'Status',
          options: [...ORDER_STATUSES],
          defaultValue: 'pending',
          required: true,
          index: true,
          admin: { width: '33%' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'menu',
          type: 'relationship',
          relationTo: 'menus',
          required: true,
          label: 'Menu',
          index: true,
          filterOptions: sameTenantFilter,
          admin: { width: '50%' },
        },
        {
          name: 'table',
          type: 'relationship',
          relationTo: 'tables',
          label: 'Table',
          // the order's menu only; takeaway (POS) has none
          filterOptions: ({ data }) => {
            const menuId = extractTenantId(data?.menu)
            return menuId !== null ? { menu: { equals: menuId } } : false
          },
          admin: { width: '50%' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'source',
          type: 'select',
          label: 'Placed by',
          options: [...ORDER_SOURCES],
          defaultValue: 'guest',
          required: true,
          admin: { width: '50%' },
        },
        {
          name: 'type',
          type: 'select',
          label: 'Type',
          options: [...ORDER_TYPES],
          defaultValue: 'dine_in',
          required: true,
          admin: { width: '50%' },
        },
      ],
    },
    { name: 'guestName', type: 'text', label: 'Guest name', maxLength: 120 },
    { name: 'notes', type: 'textarea', label: 'Notes', maxLength: 500 },
    {
      name: 'items',
      type: 'array',
      label: 'Items',
      labels: { singular: 'Item', plural: 'Items' },
      required: true,
      minRows: 1,
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'item',
              type: 'relationship',
              relationTo: 'menu-items',
              required: true,
              label: 'Item',
              admin: { width: '50%' },
            },
            {
              name: 'quantity',
              type: 'number',
              label: 'Quantity',
              required: true,
              defaultValue: 1,
              min: 1,
              max: 99,
              admin: { width: '20%' },
            },
            { name: 'unitPrice', type: 'number', label: 'Price', admin: { ...computed, width: '15%', components: money } },
            { name: 'lineTotal', type: 'number', label: 'Line', admin: { ...computed, width: '15%', components: money } },
          ],
        },
        // the item's title when ordered, in the order's locale
        { name: 'title', type: 'text', label: 'Title', admin: computed },
        {
          name: 'selectedOptions',
          type: 'array',
          label: 'Choices',
          labels: { singular: 'Choice', plural: 'Choices' },
          fields: [
            {
              type: 'row',
              fields: [
                // the choice row id on the item (`modifierGroups[].options[].id`): the input
                { name: 'option', type: 'text', required: true, label: 'Choice id', admin: { width: '25%' } },
                { name: 'group', type: 'text', label: 'Group', admin: { ...computed, width: '25%' } },
                { name: 'label', type: 'text', label: 'Choice', admin: { ...computed, width: '30%' } },
                { name: 'price', type: 'number', label: 'Extra', admin: { ...computed, width: '20%', components: money } },
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'subtotal', type: 'number', label: 'Subtotal', admin: { ...computed, width: '25%', components: money } },
        { name: 'total', type: 'number', label: 'Total', admin: { ...computed, width: '25%', components: money } },
        {
          name: 'amountPaid',
          type: 'number',
          label: 'Paid',
          defaultValue: 0,
          admin: { ...computed, width: '25%', components: money },
        },
        { name: 'balance', type: 'number', label: 'Balance', admin: { ...computed, width: '25%', components: money } },
      ],
    },
    {
      // not stored: the order's business name, for super users only (orders of every business
      // share numbers #1, #2…); everyone else sees one business and gets no field and no column
      name: 'business',
      type: 'text',
      label: 'Business',
      virtual: true,
      access: {
        read: ({ req }) => isActiveSuperUser(req.user),
        create: () => false,
        update: () => false,
      },
      hooks: { afterRead: [businessLabel] },
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'paymentStatus',
      type: 'select',
      label: 'Payment',
      options: [...PAYMENT_STATUSES],
      defaultValue: 'unpaid',
      required: true,
      index: true,
      // recomputed from payments in phase 2
      admin: { ...computed, position: 'sidebar' },
    },
    { name: 'currency', type: 'text', label: 'Currency', admin: { ...computed, position: 'sidebar' } },
    // the menu's Ordering settings when the order was placed (plan: "snapshotted on each order")
    {
      name: 'flow',
      type: 'select',
      label: 'Who handles it',
      options: [...ORDER_FLOWS],
      admin: { ...computed, position: 'sidebar' },
    },
    {
      name: 'showPrices',
      type: 'checkbox',
      label: 'Prices shown to the guest',
      admin: { ...computed, position: 'sidebar' },
    },
  ],
}
