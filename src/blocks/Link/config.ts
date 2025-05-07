import { CSSNameWithCustomFiled } from '@/fields/css'
import { Block } from 'payload'

export const LinkBlock: Block = {
  slug: 'link',
  interfaceName: 'LinkBlock',
  fields: [
    {
      type: 'tabs',
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
              name: 'href',
              type: 'text',
              required: true,
              localized: true,
            },
            {
              name: 'new_tab',
              label: 'Open in new tab',
              type: 'checkbox',
            },
            {
              name: 'variant',
              type: 'select',
              localized: true,
              required: true,
              defaultValue: 'link',
              options: [
                { label: 'Link', value: 'link' },
                { label: 'Button Primary', value: 'btn-primary' },
                { label: 'Button Secondary', value: 'btn-secondary' },
                { label: 'Button Outline', value: 'btn-outline' },
                { label: 'Button', value: 'btn' },
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
