'use client'

import { getStyles } from '@/fields/css'
import { LinkBlock as LinkBlockType } from '@/payload-types'
import { css } from '@/utilities/constants'
import Link from 'next/link'
import React from 'react'

export interface LinkBlockProps extends LinkBlockType {}

type HeaderVariants = NonNullable<LinkBlockType['main']>['variant']

export const LinkBlock = ({ main, styles }: LinkBlockProps) => {
  if (!main) return null
  const { text, variant, href, new_tab } = main
  const { cssName, cssStyle } = getStyles({ ...styles })

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

  const onLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    //handle analytics here
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
      <Link
        onClick={onLinkClick}
        className={`${getVariant(variant)} ${cssName}`}
        href={href || ''}
        target={(new_tab && '_blank') || undefined}
      >
        {text}
      </Link>
    </React.Fragment>
  )
}
