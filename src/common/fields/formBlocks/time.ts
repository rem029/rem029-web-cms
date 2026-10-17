import type { Block } from 'payload'

import { childFields } from './childFields'

// A time of day.
export const timeBlock: Block = {
  slug: 'time',
  interfaceName: 'FormTimeBlock',
  labels: { singular: 'Time', plural: 'Times' },
  fields: [...childFields],
}
