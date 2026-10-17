import type { SelectField } from 'payload'

/** Currencies a business can price its menus in (ISO 4217); extend the list when a tenant asks. */
export const CURRENCY_CODES = [
  'USD',
  'EUR',
  'GBP',
  'QAR',
  'AED',
  'SAR',
  'KWD',
  'BHD',
  'OMR',
  'JOD',
  'EGP',
  'INR',
  'PHP',
] as const

export type CurrencyCode = (typeof CURRENCY_CODES)[number]

export const DEFAULT_CURRENCY: CurrencyCode = 'USD'

/**
 * The tenant's menu currency (rem0017). Not `required`: Settings docs saved before this field
 * have none, and the menu falls back to DEFAULT_CURRENCY.
 */
export const currencyField: SelectField = {
  name: 'currency',
  type: 'select',
  label: 'Currency',
  defaultValue: DEFAULT_CURRENCY,
  options: CURRENCY_CODES.map((code) => ({ label: code, value: code })),
  admin: { description: 'Prices on your menus use this currency.' },
}
