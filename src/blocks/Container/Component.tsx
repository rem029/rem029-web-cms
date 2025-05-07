import { ContainerBlock as ContainerBlockType } from '@/payload-types'
import { css } from '@/utilities/constants'

import React from 'react'

import { HeaderBlock } from '@/blocks/Header/Component'
import { TextBlock } from '@/blocks/Text/Component'
import { LinkBlock } from '@/blocks/Link/Component'
import { EmbedBlock } from '@/blocks/Embed/Component'
import { MultiMediaBlock } from '@/blocks/MultiMedia/Component'

export interface ContainerBlockTypeProps extends ContainerBlockType {}

const componentsMap: Record<string, React.ComponentType<any>> = {
  header: HeaderBlock,
  text: TextBlock,
  link: LinkBlock,
  embed: EmbedBlock,
  multimedia: MultiMediaBlock,
}

export const ContainerBlock = ({ components, styles }: ContainerBlockTypeProps) => {
  if (!components) return null

  const cssStyle = styles?.css_style || ''
  const cssName = styles?.css_name || ''

  return (
    <React.Fragment>
      {cssStyle && (
        <style
          dangerouslySetInnerHTML={{
            __html: cssStyle || '',
          }}
        />
      )}

      <div className={`${css('section__container')} ${cssName}`}>
        {components.components?.map((item, idx) => {
          const Block = componentsMap[item['blockType']] || null
          if (!Block) return null
          return <Block key={item['blockType'] + '_' + idx} {...item} />
        })}
      </div>
    </React.Fragment>
  )
}
