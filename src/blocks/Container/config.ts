import { CSSNameWithCustomFiled } from '@/fields/css'
import { Block } from 'payload'
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
      required: true,
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
