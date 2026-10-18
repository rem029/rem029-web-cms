import { Geist, JetBrains_Mono, Space_Grotesk } from 'next/font/google'
import type { ReactNode } from 'react'

import { initialThemeScript } from './initialTheme'

// Self-hosted at build time (no request to Google from the browser). next/font hashes the family
// names, so the admin theme reads them from these variables.
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['700'], display: 'swap' })
const geist = Geist({ subsets: ['latin'], weight: ['400', '500', '600'], display: 'swap' })
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
})

// built once at module load; the values are next/font's own family names, never user input
const fontVariables = `:root{--admin-font-space-grotesk:${spaceGrotesk.style.fontFamily};--admin-font-geist:${geist.style.fontFamily};--admin-font-jetbrains-mono:${jetbrainsMono.style.fontFamily}}`

/**
 * Admin `providers` slot: wraps the whole admin (login included), hands the theme its fonts and
 * sets the device's theme before the first paint (`initialTheme.ts`). Phase 7 adds the selected
 * tenant's colours here.
 */
export function AdminTheme({ children }: { children?: ReactNode }) {
  return (
    <>
      {/* first in <body>: runs before the first paint, so a dark device never flashes light */}
      <script dangerouslySetInnerHTML={{ __html: initialThemeScript }} />
      {/* raw text: React would escape the quotes in the family names inside <style> */}
      <style dangerouslySetInnerHTML={{ __html: fontVariables }} />
      {children}
    </>
  )
}
