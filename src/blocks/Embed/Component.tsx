import { getStyles } from '@/fields/css'
import { EmbedBlock as EmbedBlockType } from '@/payload-types'
import dOMPurify from 'isomorphic-dompurify'
import React from 'react'

export type EmbedBlockProps = EmbedBlockType

export const EmbedBlock = ({ main, styles }: EmbedBlockProps) => {
  const { html } = main
  if (!html) return null

  const cleanHtml = dOMPurify.sanitize(html)
  const { cssName, cssStyle } = getStyles({ ...styles })

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
