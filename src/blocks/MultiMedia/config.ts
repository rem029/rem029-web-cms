import { CSSNameWithCustomFiled } from '@/fields/css'
import { Block } from 'payload'

export const MultiMediaBlock: Block = {
  slug: 'multimedia',
  interfaceName: 'MultiMediaBlock',
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
              name: 'image',
              type: 'upload',
              relationTo: 'media',
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
