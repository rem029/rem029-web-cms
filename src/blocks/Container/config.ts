import { CSSNameWithCustomFiled } from '@/fields/css'
import { Block } from 'payload'
import { EmbedBlock } from '../Embed/config'
import { HeaderBlock } from '../Header/config'
import { LinkBlock } from '../Link/config'
import { TextBlock } from '../Text/config'
import { MultiMediaBlock } from '../MultiMedia/config'
import { CardWithBackgroundBlock } from '../CardWithBackground/config'
import { CardInlineImageBlock } from '../CardInlineImage/config'
import { CardRowBlock } from '../CardRow/config'
import { FormBlock } from '../old/Form/config'

export const sectionBlocks: Block[] = [
  HeaderBlock,
  TextBlock,
  LinkBlock,
  MultiMediaBlock,
  EmbedBlock,
  CardWithBackgroundBlock,
  CardInlineImageBlock,
  CardRowBlock,
  FormBlock,
]

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
