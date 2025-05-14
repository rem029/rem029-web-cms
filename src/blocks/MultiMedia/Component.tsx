import { getStyles } from '@/fields/css'
import { Media, MultiMediaBlock as MultiMediaBlockType } from '@/payload-types'
import { css } from '@/utilities/constants'
import Image from 'next/image'
import React from 'react'

export type MultiMediaBlockProps = MultiMediaBlockType

export const MultiMediaBlock = ({ main, styles }: MultiMediaBlockProps) => {
  if (!main) return null
  const { cssName, cssStyle } = getStyles({ ...styles })
  const { image } = main
  const img = image as Media

  return (
    <React.Fragment>
      {cssStyle && (
        <style
          dangerouslySetInnerHTML={{
            __html: cssStyle,
          }}
        />
      )}
      <div className={`${css('multimedia')} ${cssName}`}>
        <Image src={img?.url || ''} alt={img?.alt || ''} fill loading="lazy" />
      </div>
    </React.Fragment>
  )
}
