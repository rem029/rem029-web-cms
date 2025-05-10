import { cardsFields } from '@/fields/cards'
import { CSSNameWithCustomFiled } from '@/fields/css'
import type { Block } from 'payload'

export const CardRowBlock: Block = {
  slug: 'card-row',
  interfaceName: 'CardRowBlock',
  dbName: 'card_r',
  labels: {
    singular: 'Card Row Block',
    plural: 'Card Row Blocks',
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
