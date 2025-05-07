import { CSSNameWithCustomFiled } from '@/fields/css'
import { Block } from 'payload'

export const TextBlock: Block = {
  slug: 'text',
  interfaceName: 'TextBlock',
  fields: [
    {
      type: 'tabs',
      required: true,
      tabs: [
        {
          name: 'main',
          label: 'Main',
          fields: [
            {
              name: 'text',
              type: 'richText',
              localized: true,
              required: true,
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
