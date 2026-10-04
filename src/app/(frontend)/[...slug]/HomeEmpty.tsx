import React from 'react'
import type { TypedLocale } from 'payload'
import { css } from '@/utilities/constants'

type Props = {
  locale?: TypedLocale
}

export function HomeEmpty({ locale = 'en' }: Props) {
  const isArabic = locale === 'ar'

  return (
    <div className={css('section')} style={{ minHeight: '100dvh' }}>
      <div className={`${css('section__container')} py-28 text-center`}>
        <div className="prose mx-auto">
          <h1 className="m-0">{isArabic ? 'مرحبًا' : 'Welcome'}</h1>
          <p className="mt-4">
            {isArabic
              ? 'لا توجد صفحة رئيسية لهذا الموقع بعد.'
              : "This site doesn't have a home page yet."}
          </p>
        </div>
      </div>
    </div>
  )
}
