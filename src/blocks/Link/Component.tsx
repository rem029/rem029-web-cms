'use client'

import { getStyles } from '@/fields/css'
import { LinkBlock as LinkBlockType } from '@/payload-types'
import { addAnalytics } from '@/utilities/analytics'
import { css } from '@/utilities/constants'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import React from 'react'

export type LinkBlockProps = LinkBlockType

type HeaderVariants = NonNullable<LinkBlockType['main']>['variant']

export const LinkBlock = ({ main, styles }: LinkBlockProps) => {
  const router = useRouter()
  const pathName = usePathname()

  const { text, variant, href, new_tab } = main!
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

  const onLinkClick = (_: React.MouseEvent<HTMLAnchorElement>) => {
    addAnalytics({
      eventType: 'click',
      clickedUrl: normalizedHref,
      pagePath: pathName,
      payload: { elementId: styles?.elemId },
    })

    router.push(normalizedHref)
    router.refresh()
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
