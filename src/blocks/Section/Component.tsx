import { SectionBlock as SectionBlockType } from '@/payload-types'
import { css } from '@/utilities/constants'

import React from 'react'
import { ContainerBlock } from '../Container/Component'
import { getStyles } from '@/fields/css'

export interface SectionBlockTypeProps extends SectionBlockType {}

export const SectionBlock = ({ components, styles }: SectionBlockTypeProps) => {
  const { components: componentsList } = components
  if (!componentsList) return null

  const { cssName, cssStyle, elemId } = getStyles({ ...styles })

  return (
    <React.Fragment>
      {cssStyle && (
        <style
          dangerouslySetInnerHTML={{
            __html: cssStyle || '',
          }}
        />
      )}

      <div id={elemId || undefined} className={`${css('section')} ${cssName}`}>
        {componentsList.map((component, idx) => {
          return <ContainerBlock key={'section_' + idx} {...component} />
        })}
      </div>
    </React.Fragment>
  )
}
