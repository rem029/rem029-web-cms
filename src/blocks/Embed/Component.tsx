import { EmbedBlock as BlockType } from '@/payload-types'
import React from 'react'

export interface EmbedBlockProps {
  block: BlockType
}

export const EmbedBlock = ({ block }: EmbedBlockProps) => {
  const { styles, main } = block

  if (!main) return null
  const { html } = main

  return (
    <React.Fragment>
      {styles?.css_style && (
        <style
          dangerouslySetInnerHTML={{
            __html: styles?.css_style,
          }}
        />
      )}
      {html && <div dangerouslySetInnerHTML={{ __html: html }} />}
    </React.Fragment>
  )
}
