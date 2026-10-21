import type { SelectFieldSingleValidation, Tab, TextFieldSingleValidation } from 'payload'
import { select } from 'payload/shared'

import { WEEKDAY_LABELS, WEEKDAYS } from '@/common/utils/restaurantHours'

const pad = (value: number): string => String(value).padStart(2, '0')

/** Every half hour, for opening hours. */
const HALF_HOURS = Array.from(
  { length: 48 },
  (_, i) => `${pad(Math.floor(i / 2))}:${pad((i % 2) * 30)}`,
)

/** Every hour, for when the business day starts. */
const HOURS = Array.from({ length: 24 }, (_, i) => `${pad(i)}:00`)

/**
 * A timezone the server knows (IANA, e.g. Asia/Qatar). Stored as text, not a select: a select
 * would be a Postgres enum of ~420 values that changes with Node's timezone data (schema drift).
 * The admin still shows a dropdown (`TimezoneSelect`).
 */
const validateTimezone: TextFieldSingleValidation = (value) => {
  if (!value || !value.trim()) return true
  // the timezone library decides: it also knows aliases (Asia/Calcutta) that a browser's list
  // may show instead of the canonical name
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value.trim() })
    return true
  } catch {
    return 'Pick a timezone from the list.'
  }
}

const isWeekday = (val: unknown): val is (typeof WEEKDAYS)[number] =>
  typeof val === 'string' && (WEEKDAYS as readonly string[]).includes(val)

const isRowWithWeekday = (row: unknown): row is { weekday: (typeof WEEKDAYS)[number] } =>
  typeof row === 'object' && row !== null && 'weekday' in row && isWeekday(row.weekday)

/** The opening hours rows of the form data, or none. */
const openingHoursRows = (data: unknown): unknown[] => {
  if (typeof data !== 'object' || data === null || !('restaurant' in data)) return []
  const restaurant = data.restaurant
  if (typeof restaurant !== 'object' || restaurant === null) return []
  if (!('openingHours' in restaurant) || !Array.isArray(restaurant.openingHours)) return []
  return restaurant.openingHours
}

const hasId = (row: unknown): row is { id: string } =>
  typeof row === 'object' && row !== null && 'id' in row && typeof row.id === 'string'

/**
 * The row being validated. Saves pass `path` (['restaurant', 'openingHours', <index>, 'weekday'],
 * the index a number or a string); the admin's live check (Payload 3.44 form state) passes no
 * `path` despite its type, so the row is found by its id there. Recheck after the Payload upgrade.
 */
const rowIndex = (
  rows: unknown[],
  path: (number | string)[] | undefined,
  siblingData: unknown,
): number | null => {
  const fromPath = Number(path?.at(-2))
  if (Number.isInteger(fromPath)) return fromPath
  if (!hasId(siblingData)) return null
  const index = rows.findIndex((row) => hasId(row) && row.id === siblingData.id)
  return index === -1 ? null : index
}

/**
 * One row per weekday at most. Checked on each row's Day, not on the list: the admin shows a field
 * error next to that row (an error on the array only reached the toast), and only the repeat is
 * flagged, not the first row of that day.
 */
const validateWeekday: SelectFieldSingleValidation = async (value, options) => {
  const base = await select(value, options)
  if (base !== true) return base
  if (!isWeekday(value)) return true

  const rows = openingHoursRows(options.data)
  const index = rowIndex(rows, options.path, options.siblingData)
  if (index === null) return true

  const earlierRows = rows.slice(0, index)
  const repeated = earlierRows.some((row) => isRowWithWeekday(row) && row.weekday === value)
  if (repeated) {
    return `${WEEKDAY_LABELS[value]} already has a row. Pick another day or remove this row.`
  }
  return true
}

/**
 * Settings' **Restaurant** tab (rem0018 phase 1 step 1b): the business's day, hours and details
 * for the guest menu ("Closed, opens at 8:00"), order numbers, receipts (rem0022) and the report.
 * Named tab, so the data is `restaurant.*`. Address and phone stay in the General tab's contact
 * fields; receipts read them from there.
 */
export const restaurantTab: Tab = {
  name: 'restaurant',
  label: 'Restaurant',
  description: 'Used by menus with ordering, receipts and the orders report.',
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'name',
          type: 'text',
          label: 'Restaurant name',
          // guests see it on receipts
          localized: true,
          admin: { width: '50%', description: 'Leave empty to use the site name.' },
        },
        {
          name: 'logo',
          type: 'upload',
          relationTo: 'media',
          label: 'Logo',
          admin: { width: '50%', description: 'Leave empty to use the site logo.' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'timezone',
          type: 'text',
          label: 'Timezone',
          // not required: empty means UTC (Settings docs saved before rem0018 have none)
          defaultValue: 'UTC',
          validate: validateTimezone,
          admin: {
            width: '50%',
            components: {
              Field: '@/collections/Settings/components/TimezoneSelect#TimezoneSelect',
            },
          },
        },
        {
          name: 'dayStartsAt',
          type: 'select',
          label: 'New day starts at',
          // not required: empty means midnight
          defaultValue: '00:00',
          options: HOURS.map((hour) => ({ label: hour, value: hour })),
          admin: {
            width: '50%',
            description:
              'Order numbers restart and reports count from this time. Open past midnight? Pick a time after you close, e.g. 04:00.',
          },
        },
      ],
    },
    {
      name: 'openingHours',
      type: 'array',
      label: 'Opening hours',
      labels: { singular: 'Day', plural: 'Days' },
      maxRows: 7,
      admin: {
        components: {
          RowLabel: '@/collections/Settings/components/OpeningHoursRowLabel#OpeningHoursRowLabel',
        },
        description: 'Leave empty if you take orders any time. Days without a row are closed.',
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'weekday',
              type: 'select',
              label: 'Day',
              required: true,
              validate: validateWeekday,
              options: WEEKDAYS.map((day) => ({ label: WEEKDAY_LABELS[day], value: day })),
              admin: { width: '30%' },
            },
            {
              name: 'opens',
              type: 'select',
              label: 'Opens',
              options: HALF_HOURS.map((time) => ({ label: time, value: time })),
              admin: { width: '25%', condition: (_, row) => row?.closed !== true },
            },
            {
              name: 'closes',
              type: 'select',
              label: 'Closes',
              options: HALF_HOURS.map((time) => ({ label: time, value: time })),
              admin: {
                width: '25%',
                condition: (_, row) => row?.closed !== true,
                description: 'Earlier than Opens = after midnight.',
              },
            },
            {
              name: 'closed',
              type: 'checkbox',
              label: 'Closed',
              defaultValue: false,
              admin: { width: '20%' },
            },
          ],
        },
      ],
    },
    {
      name: 'ordersOnlyWhenOpen',
      type: 'checkbox',
      label: 'Take orders only while open',
      defaultValue: false,
    },
    {
      type: 'collapsible',
      label: 'Business details',
      admin: { initCollapsed: true },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'legalName',
              type: 'text',
              label: 'Legal name',
              admin: { width: '50%' },
            },
            {
              name: 'taxNumber',
              type: 'text',
              label: 'Tax or registration number',
              admin: { width: '50%' },
            },
          ],
        },
      ],
    },
  ],
}
