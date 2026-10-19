import type { FilterOptions, SelectField, TextField } from 'payload'

import { extractTenantId } from '@/common/utils/tenantCollections'

/**
 * Field definitions shared by the menu collections (rem0017): the catalog (categories,
 * allergens, tags, items) and `menus`. Plain objects, spread or overridden where used.
 */

/** The localized title every menu doc has; the slug and the admin title come from it. */
export const menuTitleField: TextField = {
  name: 'title',
  type: 'text',
  label: 'Title',
  required: true,
  localized: true,
}

/** When an item is served; guests filter by it on the menu page. */
export const AVAILABILITY_VALUES = ['breakfast', 'lunch', 'dinner', 'all_day'] as const

export type Availability = (typeof AVAILABILITY_VALUES)[number]

export const availabilityField: SelectField = {
  name: 'availability',
  type: 'select',
  label: 'Served',
  hasMany: true,
  // not required: API callers may leave it out, and an empty list means all day
  defaultValue: ['all_day'],
  options: [
    { label: 'Breakfast', value: 'breakfast' },
    { label: 'Lunch', value: 'lunch' },
    { label: 'Dinner', value: 'dinner' },
    { label: 'All day', value: 'all_day' },
  ],
  admin: {
    description: 'Guests can filter the menu by these when the menu shows the availability filter.',
  },
}

/** Admin pickers offer only docs of the doc's own tenant (`validateSameTenant` enforces it). */
export const sameTenantFilter: FilterOptions = ({ data }) => {
  const tenantId = extractTenantId(data?.tenant)
  return tenantId !== null ? { tenant: { equals: tenantId } } : false
}
