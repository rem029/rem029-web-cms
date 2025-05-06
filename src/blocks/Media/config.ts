import { CSSNameWithCustomFiled } from '@/fields/css'
import { Block } from 'payload'

export const MediaBlock: Block = {
  slug: 'media',
  interfaceName: 'MediaBlock',
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          name: 'main',
          label: 'Main',
          fields: [
            {
              name: 'image',
              type: 'upload',
              relationTo: 'media',
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
