import type { Block } from 'payload'

import { childFields } from './childFields'

// a number picked on a range (e.g. 0–10 "how likely are you to recommend us")
export const scaleBlock: Block = {
  slug: 'scale',
  interfaceName: 'FormScaleBlock',
  labels: { singular: 'Scale', plural: 'Scales' },
  fields: [
    ...childFields,
    {
      type: 'row',
      fields: [
        { name: 'min', type: 'number', label: 'Minimum', defaultValue: 0 },
        { name: 'max', type: 'number', label: 'Maximum', defaultValue: 10 },
        { name: 'step', type: 'number', label: 'Step', defaultValue: 1, min: 1 },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'min_label', type: 'text', label: 'Minimum label', localized: true },
        { name: 'max_label', type: 'text', label: 'Maximum label', localized: true },
      ],
    },
  ],
}
