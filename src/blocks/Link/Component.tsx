import { CMSLink } from '@/components/Link'
import { LinkBlock as BlockType } from '@/payload-types'
import { css } from '@/utilities/constants'
import React from 'react'

export interface LinkBlockProps {
  block: BlockType
}

type HeaderVariants = NonNullable<BlockType['main']>['variant']

export const LinkBlock = ({ block }: LinkBlockProps) => {
  const { styles, main } = block

  if (!main) return null
  const { text, variant, href } = main
  const cssName = styles?.css_name || ''

  const getVariant = (variant: HeaderVariants) => {
    switch (variant) {
      case 'btn':
        return css('btn')
      case 'btn-outline':
        return css('btn-outline')
      case 'btn-primary':
        return css('btn-primary')
      case 'btn-secondary':
        return css('btn-secondary')
      case 'link':
        return css('link')
      default:
        return css('link')
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
      <CMSLink
        className={`${getVariant(variant)} ${cssName}`}
        label={text}
        href={href || ''}
        newTab={false}
      />
    </React.Fragment>
  )
}
