import type { Metadata } from 'next'

import { cn } from '@/utilities/ui'
import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import React from 'react'

import { AdminBar } from '@/components/AdminBar'
import { Footer } from '@/collections/Footer/Component'
import { Header } from '@/collections/Header/Component'

import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { draftMode } from 'next/headers'

import './globals.css'
import { getTenantDoc } from '@/common/utils/getTenantDoc'
import { getFrontendTenantId, getFrontendTenantURL } from '@/common/utils/frontendTenant'
import Script from 'next/script'

import { Media } from '@/payload-types'
import { defaultThemeCSS } from '@/utilities/defaults'
import DOMPurify from 'isomorphic-dompurify'
import { sanitizeCSS } from '@/utilities/sanitize'
import { TypedLocale } from 'payload'
import { cookies } from 'next/headers'
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY } from '@/utilities/constant'
import { AnalyticsComponent } from '@/components/Analytics'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { isEnabled } = await draftMode()
  const cookieStore = await cookies()
  const locale = (cookieStore.get(LOCALE_STORAGE_KEY)?.value || DEFAULT_LOCALE) as TypedLocale
  const tenantId = await getFrontendTenantId()
  const themes = await getTenantDoc('theme', tenantId, {
    depth: 1,
    locale: locale as TypedLocale,
  })
  const settings = await getTenantDoc('settings', tenantId, {
    depth: 1,
    locale: locale as TypedLocale,
  })

  const theme = themes?.themes?.find((theme) => theme.active === true)
  const css = theme?.css || defaultThemeCSS
  const js = theme?.js || ''

  const cleanJs = DOMPurify.sanitize(js)
  const cleanCss = sanitizeCSS(css)
  const favicon = (settings?.favicon as Media)?.url || ''

  return (
    <html
      className={cn(GeistSans.variable, GeistMono.variable)}
      lang="en"
      suppressHydrationWarning
      data-theme="light"
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
    >
      <head>
        {favicon && <link href={favicon} rel="icon" sizes="32x32" />}

        {cleanCss && (
          <style
            dangerouslySetInnerHTML={{
              __html: cleanCss,
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

        <Header settings={settings} locale={locale} />
        <AnalyticsComponent draftMode={isEnabled} />
        {children}
        <Footer settings={settings} locale={locale} />

        {js && (
          <Script
            id="theme-custom-js"
            dangerouslySetInnerHTML={{
              __html: cleanJs,
            }}
          />
        )}
      </body>
    </html>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL(await getFrontendTenantURL()),
    openGraph: mergeOpenGraph(),
  }
}
