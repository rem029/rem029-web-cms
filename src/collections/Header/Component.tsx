import { HeaderClient } from './Component.client'
import { getDefaultTenantId, getTenantDoc } from '@/common/utils/getTenantDoc'
import React from 'react'

import type { Setting } from '@/payload-types'
import { TypedLocale } from 'payload'

interface HeaderProps {
  settings: Setting | null
  locale?: TypedLocale
}

export async function Header({ settings, locale }: HeaderProps) {
  const defaultTenantId = await getDefaultTenantId()
  const headerData = await getTenantDoc('header', defaultTenantId, { depth: 1, locale })

  return <HeaderClient data={headerData} settings={settings} />
}
