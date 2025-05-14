import { getCachedGlobal } from '@/utilities/getGlobals'
import Link from 'next/link'
import React from 'react'

import type { Footer, Media, Setting } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { Logo } from '@/components/Logo/Logo'
import { css } from '@/utilities/constants'
import RichText from '@/components/RichText'
import { SocialMedia } from '@/components/Social'
import { defaultFooterCopyRight } from '@/utilities/defaults'
import { LocaleSwitch } from '@/components/Locale'

interface FooterProps {
  settings: Setting
}

export async function Footer({ settings }: FooterProps) {
  const footerData: Footer = await getCachedGlobal('footer', 1)()

  const navItems = footerData?.navItems || []

  return (
    <footer className={css('footer')}>
      <div className={css('footer__container')}>
        <div className={css('footer__section')}>
          <Link className={css('footer__logo')} href="/">
            <Logo src={(settings?.logo as Media)?.url || ''} />
          </Link>
          {settings?.localeSwitch?.enableLocaleFooter && <LocaleSwitch location="footer" />}
        </div>

        <nav className={css('footer__nav')}>
          {navItems.map(({ link }, i) => {
            return <CMSLink key={i} className={css('footer__nav-item')} {...link} />
          })}
        </nav>

        {settings?.address?.full_address && (
          <p className={css('footer__address')}>{settings.address.full_address}</p>
        )}

        <SocialMedia
          classNameContainer={css('footer__social')}
          classNameItem={css('footer__social-item')}
          socialMedia={settings?.socialMedia}
        />

        {footerData?.copyright && (
          <div className={css('footer_copyright')}>
            <RichText data={footerData.copyright || defaultFooterCopyRight} enableGutter={false} />
          </div>
        )}
      </div>
    </footer>
  )
}
