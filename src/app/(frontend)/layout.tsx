import type { Metadata } from 'next'

import { cn } from '@/utilities/ui'
import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import React from 'react'

import { AdminBar } from '@/components/AdminBar'
import { Footer } from '@/Footer/Component'
import { Header } from '@/Header/Component'

import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { draftMode } from 'next/headers'

import './globals.css'
import { getServerSideURL } from '@/utilities/getURL'
import { getGlobal } from '@/utilities/getGlobals'
import Script from 'next/script'
import { Media } from '@/payload-types'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { isEnabled } = await draftMode()
  const themes = await getGlobal('theme')
  const settings = await getGlobal('settings')

  const theme = themes?.themes?.find((theme) => theme.active === true)
  const css = theme?.css || ''
  const js = theme?.js || ''

  const favicon = (settings?.favicon as Media)?.url || ''

  return (
    <html
      className={cn(GeistSans.variable, GeistMono.variable)}
      lang="en"
      suppressHydrationWarning
      data-theme="light"
    >
      <head>
        {favicon && <link href={favicon} rel="icon" sizes="32x32" />}

        {css && (
          <style
            dangerouslySetInnerHTML={{
              __html: css,
            }}
          />
        )}
      </head>
      <body>
        <AdminBar
          adminBarProps={{
            preview: isEnabled,
          }}
        />

        <Header settings={settings} />
        {children}
        <Footer settings={settings} />

        {js && (
          <Script
            id="theme-custom-js"
            dangerouslySetInnerHTML={{
              __html: js,
            }}
          />
        )}
      </body>
    </html>
  )
}

export const metadata: Metadata = {
  metadataBase: new URL(getServerSideURL()),
  openGraph: mergeOpenGraph(),
  twitter: {
    card: 'summary_large_image',
    creator: '@payloadcms',
  },
}
