import React from 'react'

import type { Page } from '@/payload-types'

import RichText from '@/components/RichText'
import { css } from '@/utilities/constants'

type LowImpactHeroType =
  | {
      children?: React.ReactNode
      richText?: never
    }
  | (Omit<Page['hero'], 'richText'> & {
      children?: never
      richText?: Page['hero']['richText']
    })

export const LowImpactHero: React.FC<LowImpactHeroType> = ({ children, richText }) => {
  return (
    <div className={css('section')}>
      <div className={css('section__container')}>
        {children ||
          (richText && <RichText data={richText} enableGutter={false} enableProse={false} />)}
      </div>
    </div>
  )
}
