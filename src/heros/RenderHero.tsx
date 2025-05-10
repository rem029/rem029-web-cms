import React from 'react'

import type { Page } from '@/payload-types'
import { CarouselHero } from './Carousel'
import { css } from '@/utilities/constants'
import { getStyles } from '@/fields/css'

const heroes = {
  carousel: CarouselHero,
}

export const RenderHero: React.FC<Page['hero']> = (props) => {
  const {
    main: { type, settings },
    styles,
  } = props || {}
  const { cssName, cssStyle } = getStyles({ ...styles })

  if (!type || type === 'none') return null

  const HeroToRender = heroes[type]

  if (!HeroToRender) return null

  return (
    <div className={`${css('hero')} ${cssName}`}>
      {cssStyle && (
        <style
          dangerouslySetInnerHTML={{
            __html: cssStyle || '',
          }}
        />
      )}
      <HeroToRender {...settings} />
    </div>
  )
}
