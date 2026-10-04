import React from 'react'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ThemePreviewClient } from './page.client'
import { getTenantDoc } from '@/common/utils/getTenantDoc'
import { getFrontendTenantId } from '@/common/utils/frontendTenant'
import { isPreviewing } from '@/common/utils/isPreviewing'
import { LivePreviewListener } from '@/components/LivePreviewListener'

export default async function ThemePreview() {
  if (!(await isPreviewing())) {
    return notFound()
  }

  const tenantId = await getFrontendTenantId()
  if (!tenantId) {
    return notFound()
  }

  const themes = await getTenantDoc('theme', tenantId)
  const settings = await getTenantDoc('settings', tenantId)

  const activeTheme = themes?.themes?.find((theme) => theme.active)

  return (
    <React.Fragment>
      <LivePreviewListener />
      <ThemePreviewClient
        activeThemeName={activeTheme?.name || 'Default CSS'}
        isPreview={true}
        settings={settings}
      />
    </React.Fragment>
  )
}

export const generateMetadata = (): Metadata => {
  return {
    title: 'Theme Preview - All UI Components',
    description: 'Preview all UI components with the current theme',
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
        noimageindex: true,
      },
    },
  }
}
