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
  const { cssName, cssStyle, elemId } = getStyles({ ...styles })

  const normalizedHref = href ? (href.startsWith('/') ? href : `/${href}`) : '/'

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
    console.log('Link clicked:', {
      href: normalizedHref,
      target: new_tab ? '_blank' : undefined,
      text,
    })
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
        id={elemId}
        onClick={onLinkClick}
        className={`${getVariant(variant)} ${cssName}`}
        href={normalizedHref}
        target={(new_tab && '_blank') || undefined}
        prefetch
        role="link"
      >
        {text || 'Link'}
      </Link>
    </React.Fragment>
  )
}
