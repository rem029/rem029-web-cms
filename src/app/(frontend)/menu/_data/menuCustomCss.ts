import { sanitizeCSS } from '@/utilities/sanitize'

/**
 * A menu's own Custom CSS (rem0017 phase 3 step 6), ready to put in a `<style>` on that menu's
 * page only. Pure. Any menu editor can write it, so it must stay CSS: imports only from the
 * trusted font hosts (`sanitizeCSS`, as the Theme's css), and every `<` escaped so the text
 * can never close its `<style>` tag and start HTML.
 */
export const menuCustomCss = (css: string | null | undefined): string => {
  if (!css || !css.trim()) return ''
  const sanitized = sanitizeCSS(css)
  const escaped = sanitized.replace(/</g, '\\3c ')
  return escaped.trim()
}
