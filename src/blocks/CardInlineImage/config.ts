import { CSSNameWithCustomFiled } from '@/fields/css'
import { LinkVariant } from '@/fields/linkVariant'
import type { Block } from 'payload'

export const CardInlineImageBlock: Block = {
  slug: 'card-inline-image',
  interfaceName: 'CardInlineImageBlock',
  dbName: 'card_in',
  labels: {
    singular: 'Card inline image',
    plural: 'Cards inline image',
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          name: 'main',
          label: 'Main',
          fields: [
            {
              name: 'image', // Assuming you'll want an image for 'image-background' and 'inline-image'
              label: 'Image',
              type: 'upload',
              relationTo: 'media', // Replace 'media' with your actual media collection slug
            },
            {
              name: 'headerTitle',
              label: 'Header Title',
              type: 'text',
            },
            {
              name: 'bodyTitle',
              label: 'Body Title',
              type: 'text',
            },
            {
              name: 'bodyText',
              label: 'Body Text',
              type: 'richText',
            },
            {
              type: 'group',
              name: 'button',
              label: 'Button',
              fields: [...LinkVariant],
            },
          ],
        },
        {
          name: 'styles',
          label: 'Styles',
          fields: [...CSSNameWithCustomFiled],
        },
      ],
    },
  ],
}
