import type { Block } from 'payload'

import { childFields } from './childFields'

// A phone number with a country code.
export const phoneBlock: Block = {
  slug: 'phone',
  interfaceName: 'FormPhoneBlock',
  labels: { singular: 'Phone number', plural: 'Phone numbers' },
  fields: [...childFields],
}
