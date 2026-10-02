import React from 'react'
import { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { ThemePreviewClient } from './page.client'
import { getDefaultTenantId, getTenantDoc } from '@/common/utils/getTenantDoc'
import { LivePreviewListener } from '@/components/LivePreviewListener'

export default async function ThemePreview({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { previewSecret, tenant } = await searchParams

  if (previewSecret !== process.env.PREVIEW_SECRET) {
    return notFound()
  }
  const { isEnabled: isDraftMode } = await draftMode()

  // the theme live preview passes the edited doc's tenant; without one, show the default tenant
  const tenantParam = Array.isArray(tenant) ? tenant[0] : tenant
  if (tenantParam && !/^\d+$/.test(tenantParam)) return notFound()
  const tenantId = tenantParam ? Number(tenantParam) : await getDefaultTenantId()

  const themes = await getTenantDoc('theme', tenantId)
  const settings = await getTenantDoc('settings', tenantId)

  const activeTheme = themes?.themes?.find((theme) => theme.active)

  return (
    <React.Fragment>
      {isDraftMode && <LivePreviewListener />}
      <ThemePreviewClient
        activeThemeName={activeTheme?.name || 'Default CSS'}
        isPreview={isDraftMode}
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
