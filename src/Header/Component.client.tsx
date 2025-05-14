'use client'

import Link from 'next/link'

import type { Header, Media, Setting } from '@/payload-types'

import { Logo } from '@/components/Logo/Logo'
import { HeaderNav } from './Nav'
import { css } from '@/utilities/constants'
import { LocaleSwitch } from '@/components/Locale'

interface HeaderClientProps {
  data: Header
  settings: Setting
}

export const HeaderClient: React.FC<HeaderClientProps> = ({ data, settings }) => {
  return (
    <header className={css('header')}>
      <div className={css('header__container')}>
        {settings?.localeSwitch?.enableLocaleHeader && <LocaleSwitch location="header" />}

        <HeaderNav data={data} settings={settings} />
        <Link href="/" className={css('header__logo')}>
          <Logo loading="eager" priority="high" src={(settings?.logo as Media)?.url || ''} />
        </Link>
      </div>
    </header>
  )
}
