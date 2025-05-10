import { css } from '@/utilities/constants'
import React from 'react'
import { LinkBlock } from '../Link/Component'
import Image from 'next/image'
import { CardWithBackgroundBlock as CardWithBackgroundBlockType, Media } from '@/payload-types'
import { getStyles } from '@/fields/css'
import RichText from '@/components/RichText'

export interface CardWithBackgroundBlockProps extends CardWithBackgroundBlockType {}

export const CardWithBackgroundBlock = ({ main, styles }: CardWithBackgroundBlockProps) => {
  const { cssName, cssStyle } = getStyles({ ...styles })

  const img = main?.image ? (main?.image as Media) : undefined
  const headerTitle = main?.headerTitle || ''
  const bodyTitle = main?.bodyTitle || ''
  const bodyText = main?.bodyText || ''

  const buttonVariant = main?.button?.variant || undefined
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
      <div className={`${css('card')} ${css('card-img-bg')} ${cssName}`}>
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
        <div className={css('card-overlay')} />
        {headerTitle && (
          <div className={`${css('card-header')}`}>
            <h6>{headerTitle}</h6>
          </div>
        )}
        <div className={`${css('card-body')} ${css('card-body-end')}`}>
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
        <div className={`${css('card-footer')}`}>
          {buttonText && (
            <LinkBlock
              blockType="link"
              main={{
                variant: buttonVariant,
                href: buttonHref,
                text: buttonText,
                new_tab: buttonNewTab,
              }}
            />
          )}
        </div>
      </div>
    </React.Fragment>
  )
}
