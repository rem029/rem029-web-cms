const TRUSTED_CSS_IMPORT_DOMAINS = ['fonts.googleapis.com', 'fonts.gstatic.com']
/**
 * Safely filters CSS content, allowing only Google font imports
 * @param css The CSS content to filter
 * @returns Filtered CSS string
 */
export const sanitizeCSS = (css: string): string => {
  if (!css) return ''

  // Filter @import statements to only allow Google fonts
  // Process this BEFORE any other sanitization
  const filteredCSS = css.replace(
    /@import\s+(?:url\(\s*['"]?([^'")]+)['"]?\s*\)|['"]([^'"]+)['"]);?/gi,
    (match, urlMatch, directMatch) => {
      const importUrl = urlMatch || directMatch || ''

      // Check if the import URL is from a trusted domain
      const isTrusted = TRUSTED_CSS_IMPORT_DOMAINS.some((domain) => importUrl.includes(domain))

      // Only keep imports from trusted domains
      return isTrusted ? match : '/* Removed untrusted import */'
    },
  )

  return filteredCSS
}
