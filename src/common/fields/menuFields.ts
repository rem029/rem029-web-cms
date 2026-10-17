import type { SelectField, TextField } from 'payload'

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
  required: true,
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
