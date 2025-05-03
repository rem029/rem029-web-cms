import { HeaderClient } from './Component.client'
import { getCachedGlobal } from '@/utilities/getGlobals'
import React from 'react'

import type { Header, Setting } from '@/payload-types'

interface HeaderProps {
  settings: Setting
}

export async function Header({ settings }: HeaderProps) {
  const headerData: Header = await getCachedGlobal('header', 1)()

  return <HeaderClient data={headerData} settings={settings} />
}
