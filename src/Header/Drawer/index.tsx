'use client'

import { CMSLink } from '@/components/Link'
import { Logo } from '@/components/Logo/Logo'
import type { Header as HeaderType, Media, Setting } from '@/payload-types'
import { css } from '@/utilities/constants'
import Link from 'next/link'
import React, { useState } from 'react'
import { GiHamburgerMenu } from 'react-icons/gi'
import { IoMdClose } from 'react-icons/io'

import { SocialMedia } from '@/components/Social'

export const DrawerNav: React.FC<{ data: HeaderType; settings: Setting }> = ({
  data,
  settings,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const navItems = data?.navItems || []

  return (
    <React.Fragment>
      <button
        className={`${css('header__btn-drawer')} max-md:block hidden`}
        onClick={() => setIsDrawerOpen(true)}
      >
        <GiHamburgerMenu />
      </button>

      <div
        className={`${css('header__drawer')} ${css('header__drawer-shadow')} transform transition-transform duration-300 ease-in-out ${
          isDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className={css('header__drawer-header')}>
          <Link href="/" className={css('header__logo')}>
            <Logo loading="eager" priority="high" src={(settings?.logo as Media)?.url || ''} />
          </Link>
          <button onClick={() => setIsDrawerOpen(false)}>
            <IoMdClose />
          </button>
        </div>

        <div className={css('header__drawer__nav')}>
          {navItems.map(({ link }, i) => (
            <CMSLink
              key={`DrawerLink_${i}`}
              className={css('header__drawer__nav-item')}
              href={link?.url || ''}
              label={link?.label}
              newTab={link?.newTab || false}
              onClick={() => setIsDrawerOpen(false)}
            />
          ))}
        </div>
        <div className={css('header__drawer-footer')}>
          {settings?.address?.full_address && (
            <p className={css('header__drawer-footer__address')}>{settings.address.full_address}</p>
          )}

          <SocialMedia
            classNameContainer={css('header__drawer-footer__social')}
            classNameItem={css('header__drawer-footer__social-item')}
            socialMedia={settings?.socialMedia}
          />
        </div>
      </div>
      {isDrawerOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}
    </React.Fragment>
  )
}
