import { getStyles } from '@/fields/css'
import { HeaderBlock as HeaderBlockType } from '@/payload-types'
import { css } from '@/utilities/constants'
import React from 'react'

export type HeaderBlockProps = HeaderBlockType

type HeaderVariants = NonNullable<HeaderBlockType['main']>['variant']

export const HeaderBlock = ({ main, styles }: HeaderBlockProps) => {
  if (!main) return null
  const { text, variant } = main
  const { cssName, cssStyle } = getStyles({ ...styles })

  const getVariant = (variant: HeaderVariants) => {
    switch (variant) {
      case 'h1':
        return <h1 className={`${css('h1')} ${cssName}`}>{text}</h1>
      case 'h2':
        return <h2 className={`${css('h2')} ${cssName}`}>{text}</h2>
      case 'h3':
        return <h3 className={`${css('h3')} ${cssName}`}>{text}</h3>
      case 'h4':
        return <h4 className={`${css('h4')} ${cssName}`}>{text}</h4>
      case 'h5':
        return <h5 className={`${css('h5')} ${cssName}`}>{text}</h5>
      case 'h6':
        return <h6 className={`${css('h6')} ${cssName}`}>{text}</h6>
      default:
        return <h6 className={`${css('h6')} ${cssName}`}>{text}</h6>
    }
  }

  return (
    <React.Fragment>
      {cssStyle && (
        <style
          dangerouslySetInnerHTML={{
            __html: cssStyle,
          }}
        />
      )}
      {getVariant(variant)}
    </React.Fragment>
  )
}
