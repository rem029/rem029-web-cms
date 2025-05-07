import { CSSNameWithCustomFiled } from '@/fields/css'
import { LinkVariant } from '@/fields/linkVariant'
import type { Block } from 'payload'

export const CardWithBackgroundBlock: Block = {
  slug: 'card-with-background',
  interfaceName: 'CardWithBackgroundBlock',
  dbName: 'card_bg',
  labels: {
    singular: 'Card with Background',
    plural: 'Cards with Background',
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
