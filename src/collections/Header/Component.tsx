import { HeaderClient } from './Component.client'
import { getTenantDoc } from '@/common/utils/getTenantDoc'
import { getFrontendTenantId } from '@/common/utils/frontendTenant'
import React from 'react'

import type { Setting } from '@/payload-types'
import { TypedLocale } from 'payload'

interface HeaderProps {
  settings: Setting | null
  locale?: TypedLocale
}

export async function Header({ settings, locale }: HeaderProps) {
  const tenantId = await getFrontendTenantId()
  const headerData = await getTenantDoc('header', tenantId, { depth: 1, locale })

  return <HeaderClient data={headerData} settings={settings} />
}
