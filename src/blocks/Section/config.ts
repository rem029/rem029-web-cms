import { Block } from 'payload'

import { CSSNameWithCustomFiled } from '@/fields/css'
import { EmbedBlock } from '../Embed/config'
import { HeaderBlock } from '../Header/config'
import { LinkBlock } from '../Link/config'
import { MediaBlock } from '../Media/config'
import { TextBlock } from '../Text/config'

export const sectionBlocks: Block[] = [HeaderBlock, TextBlock, LinkBlock, MediaBlock, EmbedBlock]

export const ContainerBlock: Block = {
  slug: 'container',
  interfaceName: 'ContainerBlock',
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
              admin: {
                initCollapsed: true,
              },
              blocks: sectionBlocks,
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
