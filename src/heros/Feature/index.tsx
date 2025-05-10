import { LinkBlock } from '@/blocks/Link/Component'
import RichText from '@/components/RichText'
import { HeroSlide, Media } from '@/payload-types'
import { css } from '@/utilities/constants'
import Image from 'next/image'

export type SingleHeroSlideObject = NonNullable<HeroSlide>[number]
export interface FeatureProps extends SingleHeroSlideObject {}

export const Feature = ({
  imageFit,
  bodyText,
  bodyTitle,
  button,
  headerTitle,
  image: img,
}: FeatureProps) => {
  img = img ? (img as Media) : undefined
  headerTitle = headerTitle || ''
  bodyTitle = bodyTitle || ''

  const buttonVariant = button?.variant
  const buttonHref = button?.href || ''
  const buttonText = button?.text || ''
  const buttonNewTab = button?.new_tab || false

  return (
    <div className={css('hero__feature')}>
      {img && (
        <Image alt={img?.alt || ''} src={img?.url || ''} fill objectFit={imageFit || 'contain'} />
      )}

      {(buttonText || headerTitle || bodyTitle || bodyText) && (
        <div className={css('hero__feature-overlay')} />
      )}

      <div className={css('hero__feature-content')}>
        {headerTitle && (
          <div className={css('hero__feature-header')}>
            <h1>{headerTitle}</h1>
          </div>
        )}

        <div className={css('hero__feature-body')}>
          {bodyTitle && <h5 className={css('hero__feature-body-title')}>{bodyTitle}</h5>}

          {bodyText && (
            <RichText
              className={`${css('hero__feature-body-text')}`}
              data={bodyText}
              enableGutter={false}
              enableProse={false}
            />
          )}
        </div>

        {buttonText && (
          <div className={css('hero__feature-footer')}>
            <LinkBlock
              blockType="link"
              main={{
                href: buttonHref,
                text: buttonText,
                variant: buttonVariant,
                new_tab: buttonNewTab,
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
