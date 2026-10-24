import type { Condition, FilterOptions, FilterOptionsProps, Tab } from 'payload'

import { getSelectedTenant } from '@/common/utils/getSelectedTenant'
import { extractTenantId } from '@/common/utils/tenantCollections'

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

// the admin form sends `tenant` without a value (the plugin's tenant field), so a saved menu reads
// its own tenant, a new one the selected business; `validateMenuStaff` checks again on save
const menuTenantId = async ({
  data,
  id,
  req,
}: Pick<FilterOptionsProps, 'data' | 'id' | 'req'>): Promise<number | null> => {
  const fromData = extractTenantId(data?.tenant)
  if (fromData !== null) return fromData
  if (id === undefined || id === null) return getSelectedTenant(req)

  const { docs } = await req.payload.find({
    collection: 'menus',
    where: { id: { equals: id } },
    draft: true,
    overrideAccess: true,
    req,
    depth: 0,
    limit: 1,
    select: { tenant: true },
  })
  return extractTenantId(docs[0]?.tenant)
}

const staffFilterOptions: FilterOptions = async ({ data, id, req }) => {
  try {
    const tenantId = await menuTenantId({ data, id, req })
    return tenantId === null ? true : { 'tenants.tenant': { equals: tenantId } }
  } catch (err) {
    req.payload.logger.error({ msg: 'menu: staff picker filter failed', menuId: id, err })
    return false
  }
}

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
    // who works this menu's orders (step 2); what they may do comes from their profile's board rows
    {
      name: 'staff',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
      label: 'Staff',
      filterOptions: staffFilterOptions,
      admin: {
        condition: whenOrdering,
        description: "Staff who work this menu's orders. Changes apply when the menu is published.",
      },
    },
    // the menu's tables (`tables.menu`); "Add new" here creates one already on this menu
    {
      name: 'tables',
      type: 'join',
      collection: 'tables',
      on: 'menu',
      label: 'Tables',
      defaultSort: 'sortOrder',
      defaultLimit: 50,
      admin: {
        condition: whenOrdering,
        defaultColumns: ['label', 'seats', 'isActive'],
        description: 'The tables guests order from. Each table belongs to this menu only.',
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
