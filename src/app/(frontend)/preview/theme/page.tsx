import React from 'react'
import { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { ThemePreviewClient } from './page.client'
import { getGlobal } from '@/utilities/getGlobals'
import { LivePreviewListener } from '@/components/LivePreviewListener'

export default async function ThemePreview({
  searchParams,
}: {
  /* eslint-disable  @typescript-eslint/no-explicit-any */
  searchParams: any
}) {
  const { previewSecret } = await searchParams

  if (previewSecret !== process.env.PREVIEW_SECRET) {
    return notFound()
  }
  const { isEnabled: isDraftMode } = await draftMode()
  const themes = await getGlobal('theme')
  const settings = await getGlobal('settings')

  if (!themes) {
    return notFound()
  }
  const activeTheme = themes.themes?.find((theme) => theme.active)
  if (!activeTheme) {
    return notFound()
  }

  return (
    <React.Fragment>
      {isDraftMode && <LivePreviewListener />}
      <ThemePreviewClient
        activeThemeName={activeTheme.name}
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
