import RichText from '@/components/RichText'
import { getStyles } from '@/fields/css'
import { TextBlock as TextBlockType } from '@/payload-types'
import { css } from '@/utilities/constants'
import React from 'react'

export type TextBlockProps = TextBlockType

export const TextBlock = ({ main, styles }: TextBlockProps) => {
  if (!main) return null
  const { cssName, cssStyle } = getStyles({ ...styles })
  const { text } = main

  return (
    <React.Fragment>
      {cssStyle && (
        <style
          dangerouslySetInnerHTML={{
            __html: cssStyle,
          }}
        />
      )}
      {text && (
        <RichText
          data={text}
          className={`${css('rich-text')} ${cssName}`}
          enableGutter={false}
          enableProse={false}
        />
      )}
    </React.Fragment>
  )
}
