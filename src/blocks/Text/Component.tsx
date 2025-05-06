import RichText from '@/components/RichText'
import { TextBlock as BlockType } from '@/payload-types'
import { css } from '@/utilities/constants'
import React from 'react'

export interface TextBlockProps {
  block: BlockType
}

export const TextBlock = ({ block }: TextBlockProps) => {
  const { styles, main } = block

  if (!main) return null
  const { text } = main
  const cssName = styles?.css_name || ''

  return (
    <React.Fragment>
      {styles?.css_style && (
        <style
          dangerouslySetInnerHTML={{
            __html: styles?.css_style,
          }}
        />
      )}
      {text && <RichText data={text} className={`${css('rich-text')} ${cssName}`} />}
    </React.Fragment>
  )
}
