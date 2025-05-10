import { cardsFields } from '@/fields/cards'
import { CSSNameWithCustomFiled } from '@/fields/css'
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
