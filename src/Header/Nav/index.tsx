'use client'

import React from 'react'
import type { Header as HeaderType, Setting } from '@/payload-types'
import { CMSLink } from '@/components/Link'
import { css } from '@/utilities/constants'
import { DrawerNav } from '../Drawer'

export const HeaderNav: React.FC<{ data: HeaderType; settings: Setting }> = ({
  data,
  settings,
}) => {
  const navItems = data?.navItems || []

  return (
    <React.Fragment>
      <nav className={`${css('header__nav')} max-md:hidden`}>
        {navItems.map(({ link }, i) => {
          return <CMSLink key={`CMSLink_${i}`} className={`${css('header__nav-item')}`} {...link} />
        })}
      </nav>
      <DrawerNav data={data} settings={settings} />
    </React.Fragment>
  )
}
