import { CSSNameWithCustomFiled } from '@/fields/css'
import { Block } from 'payload'

export const EmbedBlock: Block = {
  slug: 'embed',
  interfaceName: 'EmbedBlock',
  fields: [
    {
      type: 'tabs',

      tabs: [
        {
          name: 'main',
          label: 'Main',
          fields: [
            {
              name: 'html',
              localized: true,
              type: 'code',
              admin: { language: 'html' },
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
