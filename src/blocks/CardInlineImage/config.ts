import { cardsFields } from '@/fields/cards'
import { CSSNameWithCustomFiled } from '@/fields/css'
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
          fields: cardsFields,
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
