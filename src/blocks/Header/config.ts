import { CSSNameWithCustomFiled } from '@/fields/css'
import { Block } from 'payload'

export const HeaderBlock: Block = {
  slug: 'header',
  interfaceName: 'HeaderBlock',
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
              type: 'text',
              localized: true,
              required: true,
            },
            {
              name: 'variant',
              type: 'select',
              required: true,
              localized: true,
              defaultValue: 'h6',
              options: [
                { label: 'H1', value: 'h1' },
                { label: 'H2', value: 'h2' },
                { label: 'H3', value: 'h3' },
                { label: 'H4', value: 'h4' },
                { label: 'H5', value: 'h5' },
                { label: 'H6', value: 'h6' },
              ],
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
