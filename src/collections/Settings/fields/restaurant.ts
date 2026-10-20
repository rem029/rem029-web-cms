import type { ArrayFieldValidation, Tab, TextFieldSingleValidation } from 'payload'

import { WEEKDAYS } from '@/common/utils/restaurantHours'

const WEEKDAY_LABELS: Record<(typeof WEEKDAYS)[number], string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
}

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

/** One row per weekday at most. */
const validateOneRowPerWeekday: ArrayFieldValidation = (value) => {
  if (!Array.isArray(value)) {
    return true
  }
  const seen = new Set<(typeof WEEKDAYS)[number]>()
  for (const item of value) {
    if (isRowWithWeekday(item)) {
      if (seen.has(item.weekday)) {
        return `Each day can only have one row. Remove the second ${WEEKDAY_LABELS[item.weekday]}.`
      }
      seen.add(item.weekday)
    }
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
      validate: validateOneRowPerWeekday,
      admin: {
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
