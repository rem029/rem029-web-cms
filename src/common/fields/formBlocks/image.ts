import type { Block } from 'payload'

import { cssClassField } from './childFields'

// content only: an image between questions. no input, never in the submission
export const imageBlock: Block = {
  slug: 'image',
  interfaceName: 'FormImageBlock',
  labels: { singular: 'Image', plural: 'Images' },
  fields: [
    { name: 'media', type: 'upload', relationTo: 'media', required: true },
    {
      type: 'row',
      fields: [
        { name: 'caption', type: 'text', label: 'Caption', localized: true },
        {
          name: 'size',
          type: 'select',
          label: 'Size',
          defaultValue: 'full',
          options: [
            { label: 'Small', value: 'small' },
            { label: 'Medium', value: 'medium' },
            { label: 'Full width', value: 'full' },
          ],
        },
      ],
    },
    cssClassField,
  ],
}
