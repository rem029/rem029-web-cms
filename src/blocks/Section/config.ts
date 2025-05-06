import { Block } from 'payload'

import { CSSNameWithCustomFiled } from '@/fields/css'
import { ContainerBlock } from '../Container/config'

export const SectionBlock: Block = {
  slug: 'section',
  interfaceName: 'SectionBlock',
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          name: 'components',
          label: 'Components',
          fields: [
            {
              name: 'components',
              type: 'blocks',
              required: true,
              admin: {
                initCollapsed: true,
              },
              blocks: [ContainerBlock],
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
