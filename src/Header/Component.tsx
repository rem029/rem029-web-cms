import { HeaderClient } from './Component.client'
import { getGlobal } from '@/utilities/getGlobals'
import React from 'react'

import type { Header, Setting } from '@/payload-types'
import { TypedLocale } from 'payload'

interface HeaderProps {
  settings: Setting
  locale?: TypedLocale
}

export async function Header({ settings, locale }: HeaderProps) {
  const headerData: Header = await getGlobal('header', 1, locale)

  return <HeaderClient data={headerData} settings={settings} />
}
