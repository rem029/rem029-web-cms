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
