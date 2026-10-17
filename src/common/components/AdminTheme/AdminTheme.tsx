import { Geist, JetBrains_Mono, Space_Grotesk } from 'next/font/google'
import type { ReactNode } from 'react'

// Self-hosted at build time (no request to Google from the browser). next/font hashes the family
// names, so the admin theme reads them from these variables.
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['500', '700'], display: 'swap' })
const geist = Geist({ subsets: ['latin'], weight: ['400', '500', '600'], display: 'swap' })
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
})

// built once at module load; the values are next/font's own family names, never user input
const fontVariables = `:root{--admin-font-space-grotesk:${spaceGrotesk.style.fontFamily};--admin-font-geist:${geist.style.fontFamily};--admin-font-jetbrains-mono:${jetbrainsMono.style.fontFamily}}`

/**
 * Admin `providers` slot: wraps the whole admin (login included) and hands the theme its fonts.
 * Phase 7 adds the selected tenant's colours here.
 */
export function AdminTheme({ children }: { children?: ReactNode }) {
  return (
    <>
      {/* raw text: React would escape the quotes in the family names inside <style> */}
      <style dangerouslySetInnerHTML={{ __html: fontVariables }} />
      {children}
    </>
  )
}
