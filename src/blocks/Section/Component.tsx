import { SectionBlock as SectionBlockType } from '@/payload-types'
import { css } from '@/utilities/constants'

import React from 'react'
import { ContainerBlock } from '../Container/Component'

export interface SectionBlockTypeProps extends SectionBlockType {}

export const SectionBlock = ({ components, styles }: SectionBlockTypeProps) => {
  const { components: componentsList } = components
  if (!componentsList) return null

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
      <p>Section here</p>
      <div className={`${css('section')} ${cssName}}`}>
        {componentsList.map((component, idx) => {
          return <ContainerBlock {...component} />
        })}
      </div>
    </React.Fragment>
  )
}
