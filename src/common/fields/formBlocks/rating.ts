import type { Block } from 'payload'

import { childFields } from './childFields'

// stars or buttons; labelled points (a Likert scale) override the point count
export const ratingBlock: Block = {
  slug: 'rating',
  interfaceName: 'FormRatingBlock',
  labels: { singular: 'Rating', plural: 'Ratings' },
  fields: [
    ...childFields,
    {
      type: 'row',
      fields: [
        {
          name: 'point_count',
          type: 'number',
          label: 'Number of points',
          defaultValue: 5,
          min: 2,
          max: 10,
          admin: { description: 'Ignored when point labels are set.' },
        },
        {
          name: 'display',
          type: 'select',
          label: 'Display',
          defaultValue: 'stars',
          options: [
            { label: 'Stars', value: 'stars' },
            { label: 'Buttons', value: 'buttons' },
          ],
        },
      ],
    },
    {
      name: 'labels',
      type: 'array',
      label: 'Point labels',
      admin: {
        description:
          'Optional: one row per point (e.g. "Poor" … "Excellent"). The number of rows sets the number of points.',
      },
      fields: [{ name: 'label', type: 'text', label: 'Label', localized: true, required: true }],
    },
  ],
}
