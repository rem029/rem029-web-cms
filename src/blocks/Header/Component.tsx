import { HeaderBlock as BlockType } from '@/payload-types'
import { css } from '@/utilities/constants'
import React from 'react'

export interface HeaderBlockProps {
  block: BlockType
}

type HeaderVariants = NonNullable<BlockType['main']>['variant']

export const HeaderBlock = ({ block }: HeaderBlockProps) => {
  const { styles, main } = block

  if (!main) return null
  const { text, variant } = main
  const cssName = styles?.css_name || ''

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
      {styles?.css_style && (
        <style
          dangerouslySetInnerHTML={{
            __html: styles?.css_style,
          }}
        />
      )}
      {getVariant(variant)}
    </React.Fragment>
  )
}
