'use client'

import React from 'react'
import { css } from '@/utilities/constants'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'

interface LocaleSwitchProps {
  location: 'header' | 'header-drawer' | 'footer'
}
export const LocaleSwitch: React.FC<LocaleSwitchProps> = ({ location }) => {
  const router = useRouter()
  const pathname = usePathname()

  const switchLocale = (locale: string, e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()

    router.push(`${pathname}?lang=${locale}`)
    router.refresh()
  }
  return (
    <div className={css(`${location}__locale__select`)}>
      <Link
        onClick={(e) => switchLocale('en', e)}
        href="?lang=en"
        className={css(`${location}__locale__select-item`)}
      >
        EN
      </Link>
      <span>|</span>
      <Link
        onClick={(e) => switchLocale('ar', e)}
        href="?lang=ar"
        className={css(`${location}__locale__select-item`)}
      >
        AR
      </Link>
    </div>
  )
}
