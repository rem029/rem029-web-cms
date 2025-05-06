import { ContainerBlock as ContainerBlockType } from '@/payload-types'
import { css } from '@/utilities/constants'

import React from 'react'

export interface ContainerBlockTypeProps extends ContainerBlockType {}

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
      <p>Container here</p>
      <div className={`${css('section__container')} ${cssName}}`}>
        {components.components?.map((item, idx) => {
          return <p key={'component_' + idx}>{item['blockType'] || 'unknown'}</p>
        })}
      </div>
    </React.Fragment>
  )
}
