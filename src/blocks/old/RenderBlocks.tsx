import React, { Fragment } from 'react'

import type { Page } from '@/payload-types'

import { css } from '@/utilities/constants'
import { ArchiveBlock } from './ArchiveBlock/Component'
import { CallToActionBlock } from './CallToAction/Component'
import { ContentBlock } from './Content/Component'
import { FormBlock } from './Form/config'
import { MediaBlock } from './MediaBlock/config'

const blockComponents = {
  archive: ArchiveBlock,
  content: ContentBlock,
  cta: CallToActionBlock,
  formBlock: FormBlock,
  mediaBlock: MediaBlock,
}

export const RenderBlocks: React.FC<{
  blocks: Page['layout'][0][]
}> = (props) => {
  const { blocks } = props

  const hasBlocks = blocks && Array.isArray(blocks) && blocks.length > 0

  if (hasBlocks) {
    return (
      <Fragment>
        {blocks.map((block, index) => {
          const { blockType } = block

          if (blockType && blockType in blockComponents) {
            const Block = blockComponents[blockType]

            if (Block) {
              return (
                <div className={css('section')} key={index}>
                  <div className={css('section__container')}>
                    {/* @ts-expect-error there may be some mismatch between the expected types here */}
                    <Block {...block} disableInnerContainer />
                  </div>
                </div>
              )
            }
          }
          return null
        })}
      </Fragment>
    )
  }

  return null
}
