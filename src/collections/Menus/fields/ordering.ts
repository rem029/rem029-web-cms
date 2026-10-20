import type { Condition, Tab } from 'payload'

/**
 * Who handles a menu's orders (rem0018, sdq's "order handling"). Snapshotted on each order, so
 * changing it never breaks orders already open.
 */
export const ORDER_FLOWS = [
  { label: 'Waiter, kitchen and cashier', value: 'waiter_kitchen_cashier' },
  { label: 'Waiter and kitchen', value: 'waiter_kitchen' },
  { label: 'Kitchen only', value: 'kitchen_only' },
] as const

export type OrderFlow = (typeof ORDER_FLOWS)[number]['value']

export const DEFAULT_ORDER_FLOW: OrderFlow = 'waiter_kitchen_cashier'

const whenOrdering: Condition = (_, siblingData) => siblingData?.enabled === true

/**
 * The menu's **Ordering** tab (rem0018 phase 1 step 1b). Off by default: the menu stays
 * browse-only as rem0017 ships it. Named tab, so the data is `ordering.*`.
 */
export const orderingTab: Tab = {
  name: 'ordering',
  label: 'Ordering',
  description: 'Let guests order from their table. They scan the table QR code and order here.',
  fields: [
    {
      name: 'enabled',
      type: 'checkbox',
      label: 'Guests can order from this menu',
      defaultValue: false,
    },
    {
      name: 'flow',
      type: 'select',
      label: 'Who handles the orders',
      options: [...ORDER_FLOWS],
      defaultValue: DEFAULT_ORDER_FLOW,
      required: true,
      admin: {
        condition: whenOrdering,
        description:
          'Each order follows these steps. Changing it only affects new orders. Changes apply when the menu is published.',
      },
    },
    {
      name: 'showPrices',
      type: 'checkbox',
      label: 'Show prices to guests',
      defaultValue: true,
      admin: { condition: whenOrdering },
    },
    // the menu's tables: a table picks its menus (`tables.menus`); "Add new" here creates one
    // already linked to this menu
    {
      name: 'tables',
      type: 'join',
      collection: 'tables',
      on: 'menus',
      label: 'Tables',
      defaultSort: 'sortOrder',
      defaultLimit: 50,
      admin: {
        condition: whenOrdering,
        defaultColumns: ['label', 'seats', 'isActive'],
        description: 'The tables guests order from. Add a new one, or pick existing ones below.',
      },
    },
    {
      name: 'qr',
      type: 'ui',
      admin: {
        condition: whenOrdering,
        components: { Field: '@/collections/Menus/components/TableQrPanel#TableQrPanel' },
      },
    },
  ],
}
