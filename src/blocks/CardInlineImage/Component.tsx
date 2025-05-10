import { css } from '@/utilities/constants'
import React from 'react'
import { LinkBlock } from '../Link/Component'
import Image from 'next/image'
import { CardInlineImageBlock as CardInlineImageBlockType, Media } from '@/payload-types'
import { getStyles } from '@/fields/css'
import RichText from '@/components/RichText'

export interface CardInlineImageBlockProps extends CardInlineImageBlockType {}

export const CardInlineImageBlock = ({ main, styles }: CardInlineImageBlockProps) => {
  const { cssName, cssStyle } = getStyles({ ...styles })

  const img = main?.image ? (main?.image as Media) : undefined
  const headerTitle = main?.headerTitle || ''
  const bodyTitle = main?.bodyTitle || ''
  const bodyText = main?.bodyText || ''

  const buttonVariant = main?.button?.variant
  const buttonHref = main?.button?.href || ''
  const buttonText = main?.button?.text || ''
  const buttonNewTab = main?.button?.new_tab || false

  return (
    <React.Fragment>
      {cssStyle && (
        <style
          dangerouslySetInnerHTML={{
            __html: cssStyle || '',
          }}
        />
      )}

      <div className={`${css('card')} ${css('card-img-inline')} ${cssName}`}>
        {headerTitle && (
          <div className={`${css('card-header')}`}>
            <h6>{headerTitle}</h6>
          </div>
        )}

        {img && (
          <div className={css('card-img')}>
            <Image
              alt={img?.alt || ''}
              src={img?.url || ''}
              fill
              objectFit={main?.imageFit || 'contain'}
            />
          </div>
        )}

        <div className={`${css('card-body')}`}>
          {bodyTitle && <h5 className={`${css('card-title')}`}>{bodyTitle}</h5>}

          {bodyText && (
            <RichText
              className={`${css('card-text')}`}
              data={bodyText}
              enableGutter={false}
              enableProse={false}
            />
          )}
        </div>
        {buttonText && (
          <div className={`${css('card-footer')}`}>
            <LinkBlock
              blockType="link"
              main={{
                variant: buttonVariant,
                href: buttonHref,
                text: buttonText,
                new_tab: buttonNewTab,
              }}
            />
          </div>
        )}
      </div>
    </React.Fragment>
  )
}
