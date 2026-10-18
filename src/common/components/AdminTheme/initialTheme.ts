/**
 * Sets the admin's theme before the first paint (rem0005 phase 5). On Automatic (no
 * `payload-theme` cookie) Payload 3.44 renders `<html data-theme="light">` and only reads the
 * device's colour scheme after hydration, so a dark device saw the light admin first. This does the
 * same as Payload's `getTheme` (`@payloadcms/ui` ThemeProvider), earlier: a cookie wins, else the
 * device. Self-contained: it runs as an inline script through `toString()`, so it may use only its
 * arguments and browser globals, no imports.
 */
export function applyDeviceTheme(doc: Document, matchMedia: (query: string) => MediaQueryList) {
  const row = doc.cookie.split('; ').find((entry) => entry.startsWith('payload-theme='))
  const theme = row ? row.split('=')[1] : undefined

  if (theme === 'light' || theme === 'dark') {
    return
  }

  if (matchMedia('(prefers-color-scheme: dark)').matches) {
    doc.documentElement.setAttribute('data-theme', 'dark')
  }
}

// the inline <script> AdminTheme renders at the top of <body>
export const initialThemeScript = `(${applyDeviceTheme.toString()})(document, window.matchMedia.bind(window))`
