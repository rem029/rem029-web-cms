import { EmbedBlock as EmbedBlockType } from '@/payload-types'
import { sanitizeHTML } from '@/utilities/sanitize'
import React from 'react'

export interface EmbedBlockProps extends EmbedBlockType {}

export const EmbedBlock = ({ main, styles }: EmbedBlockProps) => {
  const { html } = main

  if (!html) return null

  const cleanHtml = sanitizeHTML(html)
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

      {html && <div className={`${cssName}`} dangerouslySetInnerHTML={{ __html: cleanHtml }} />}
    </React.Fragment>
  )
}
