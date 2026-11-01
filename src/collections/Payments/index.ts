import type { CollectionConfig, Where } from 'payload'

import { validateSameTenant } from '@/common/hooks/validateSameTenant'
import { accessCheckResolver, hiddenResolver, isActiveSuperUser } from '@/common/utils/access'
import { menuStaffAccess } from '@/common/utils/menuStaffAccess'
import { extractTenantId } from '@/common/utils/tenantCollections'

import { syncOrderPayment } from './hooks/syncOrderPayment'
import { validatePayment } from './hooks/validatePayment'

export const PAYMENT_METHODS = [
  { label: 'Cash', value: 'cash' },
  { label: 'Card', value: 'card' },
  { label: 'Online', value: 'online' },
] as const

export const PAYMENT_STATES = [
  { label: 'Pending', value: 'pending' },
  { label: 'Succeeded', value: 'succeeded' },
  { label: 'Failed', value: 'failed' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'Voided', value: 'voided' },
] as const

/** The provider of cash and card payments the cashier records (online: `PROVIDERS` in payments/registry.ts). */
export const MANUAL_PROVIDER = 'manual'

// set by the hooks: editors see them, nobody types them
const computed = { readOnly: true } as const

// stored in minor units, shown as money in the payment's currency (the order's)
const money = {
  Field: '@/collections/Orders/components/MoneyField#MoneyField',
  Cell: '@/collections/Orders/components/MoneyCell#MoneyCell',
}

// cash the cashier types (received): money in, minor units stored
const moneyInput = {
  Field: '@/collections/Payments/components/MoneyInput#MoneyInput',
  Cell: '@/collections/Orders/components/MoneyCell#MoneyCell',
}

// filled only by the hooks and server code (overrideAccess)
const serverOnly = { create: () => false, update: () => false }

/**
 * Payments (rem0018 phase 2 step 1): the one payment that pays an order, for its full total (no
 * split or part payments, user 2026-11-01). Cashiers, tenant admins and super users of the
 * order's business record it (profile `payments` + the order's menu lists the user,
 * `menuStaffAccess`; `validatePayment` also needs the cashier role). A succeeded payment is never edited: it is voided with a reason
 * and a new one recorded. The order is paid while it has a succeeded payment
 * (`syncOrderPayment`).
 */
export const Payments: CollectionConfig = {
  slug: 'payments',
  labels: { singular: 'Payment', plural: 'Payments' },
  access: {
    read: menuStaffAccess('payments', 'read'),
    create: accessCheckResolver('payments', 'create'),
    update: menuStaffAccess('payments', 'update'),
    // money records: void them; only super users remove one (a wrong test row)
    delete: ({ req }) => isActiveSuperUser(req.user),
  },
  admin: {
    group: 'Orders',
    defaultColumns: [
      'orderNumber',
      'method',
      'amount',
      'status',
      'refundDue',
      'takenBy',
      'createdAt',
    ],
    hidden: hiddenResolver('payments'),
  },
  defaultSort: '-createdAt',
  // webhook idempotency (step 2): one payment per provider transaction; manual rows have none
  indexes: [{ fields: ['provider', 'providerRef'], unique: true }],
  hooks: {
    beforeValidate: [
      validateSameTenant([{ path: 'order', collection: 'orders', label: 'order' }]),
      validatePayment,
    ],
    afterChange: [syncOrderPayment],
  },
  fields: [
    {
      name: 'order',
      type: 'relationship',
      relationTo: 'orders',
      required: true,
      label: 'Order',
      index: true,
      // the business's orders that still take a payment: unpaid and not cancelled (a completed
      // order whose payment was voided too, walkthrough 2026-11-01). Only for a new payment:
      // Payload re-checks the filter on every save, and voiding a payment must still work.
      // Today's orders first with a day switcher: the cashier dialog (phase 4).
      filterOptions: ({ data, id }) => {
        const tenantId = extractTenantId(data?.tenant)
        const sameTenant = tenantId !== null ? { tenant: { equals: tenantId } } : true
        if (id) return sameTenant
        const payable: Where = {
          and: [{ paymentStatus: { equals: 'unpaid' } }, { status: { not_equals: 'cancelled' } }],
        }
        return tenantId !== null ? { and: [{ tenant: { equals: tenantId } }, payable] } : payable
      },
      admin: { allowCreate: false },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'method',
          type: 'select',
          label: 'Method',
          options: [...PAYMENT_METHODS],
          required: true,
          defaultValue: 'cash',
          admin: { width: '33%' },
        },
        {
          // the order's total, set by validatePayment: nobody types it
          name: 'amount',
          type: 'number',
          label: 'Amount',
          access: serverOnly,
          admin: { ...computed, width: '33%', components: money },
        },
        {
          name: 'status',
          type: 'select',
          label: 'Status',
          options: [...PAYMENT_STATES],
          // set by code: cash and card are taken on the spot (validatePayment), online starts
          // pending (step 2), staff void a taken payment; hidden on a new one except for super users
          // (no field access: it would make the column nullable)
          defaultValue: 'succeeded',
          required: true,
          index: true,
          admin: {
            width: '33%',
            condition: (data, _siblingData, { user }) =>
              Boolean(data?.id) || isActiveSuperUser(user),
          },
        },
      ],
    },
    {
      type: 'row',
      admin: { condition: (data) => data?.method === 'cash' },
      fields: [
        {
          name: 'received',
          type: 'number',
          label: 'Received',
          admin: {
            width: '50%',
            components: moneyInput,
            description: 'What the guest handed over. Leave empty when it was the exact amount.',
          },
        },
        {
          name: 'change',
          type: 'number',
          label: 'Change',
          access: serverOnly,
          admin: { ...computed, width: '50%', components: money },
        },
      ],
    },
    {
      name: 'reference',
      type: 'text',
      label: 'Receipt number',
      maxLength: 100,
      admin: {
        condition: (data) => data?.method === 'card',
        description: 'The receipt number printed by the card machine.',
      },
    },
    { name: 'remarks', type: 'textarea', label: 'Remarks', maxLength: 500 },
    {
      name: 'voidReason',
      type: 'text',
      label: 'Void reason',
      maxLength: 200,
      admin: {
        condition: (data) => data?.status === 'voided',
        description: 'Why the payment was voided, e.g. "Wrong amount".',
      },
    },
    {
      // rem0018 phase 2 step 2: an online success the order didn't need (a second checkout, the
      // wrong amount, an order already paid or closed): the money moved, so it is recorded and the
      // cashier refunds it by hand, then voids it with the reason
      name: 'refundDue',
      type: 'checkbox',
      label: 'Refund due',
      defaultValue: false,
      access: serverOnly,
      admin: {
        ...computed,
        components: { Cell: '@/collections/Payments/components/RefundDueCell#RefundDueCell' },
        condition: (data) => Boolean(data?.refundDue),
        description:
          'The guest paid online twice or the wrong amount: refund them, then void this payment.',
      },
    },
    // the order's, copied when the payment is recorded: the money display, list column and access
    {
      name: 'orderNumber',
      type: 'number',
      label: 'Order',
      access: serverOnly,
      admin: { ...computed, position: 'sidebar' },
    },
    {
      name: 'menu',
      type: 'relationship',
      relationTo: 'menus',
      label: 'Menu',
      index: true,
      access: serverOnly,
      admin: { ...computed, position: 'sidebar' },
    },
    {
      name: 'currency',
      type: 'text',
      label: 'Currency',
      access: serverOnly,
      admin: { ...computed, position: 'sidebar' },
    },
    {
      name: 'takenBy',
      type: 'relationship',
      relationTo: 'users',
      label: 'Taken by',
      access: serverOnly,
      admin: { ...computed, position: 'sidebar' },
    },
    {
      name: 'provider',
      type: 'text',
      label: 'Provider',
      defaultValue: MANUAL_PROVIDER,
      access: serverOnly,
      admin: { ...computed, position: 'sidebar' },
    },
    {
      // the provider's transaction id (online, step 2)
      name: 'providerRef',
      type: 'text',
      label: 'Provider reference',
      access: serverOnly,
      admin: { ...computed, position: 'sidebar' },
    },
  ],
}
