import createDOMPurify from 'isomorphic-dompurify'

// Create whitelist of trusted domains for embeds
const TRUSTED_EMBED_DOMAINS = [
  // Video platforms
  'youtube.com',
  'youtube-nocookie.com',
  'youtu.be',
  'vimeo.com',
  'player.vimeo.com',
  'dailymotion.com',
  'twitch.tv',
  'player.twitch.tv',
  // Social media
  'twitter.com',
  'platform.twitter.com',
  'instagram.com',
  'www.instagram.com',
  'facebook.com',
  'www.facebook.com',
  // Maps
  'google.com/maps',
  'maps.google.com',
  'www.google.com/maps',
  // Documents
  'docs.google.com',
  'drive.google.com',
  'sheets.google.com',
  'slides.google.com',
  // Add other trusted domains as needed
]

// Add this after your existing TRUSTED_EMBED_DOMAINS array
const TRUSTED_CSS_IMPORT_DOMAINS = ['fonts.googleapis.com', 'fonts.gstatic.com']
// Configure DOMPurify with our preferred settings
const configureDOMPurify = (purify: typeof createDOMPurify) => {
  // Allow iframe and other embed tags/attributes
  const config = {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: [
      'allow',
      'allowfullscreen',
      'frameborder',
      'scrolling',
      'target',
      'src',
      'style',
      'class',
      'width',
      'height',
    ],
  }

  // Hook to filter iframes based on src domain
  purify.addHook('uponSanitizeElement', (node, data) => {
    // Only process iframe elements
    if (data.tagName === 'iframe') {
      const src = (node as Element).getAttribute('src') || ''
      // Check if the src attribute contains any trusted domain
      const isTrusted = TRUSTED_EMBED_DOMAINS.some((domain) => src.includes(domain))

      // If not trusted, remove the element
      if (!isTrusted) {
        node.parentNode?.removeChild(node)
      }
    }
  })

  return config
}

/**
 * Safely sanitizes HTML content while allowing embeds from trusted domains
 * @param html The HTML content to sanitize
 * @returns Sanitized HTML string
 */
export const sanitizeHTML = (html: string): string => {
  const purify = createDOMPurify()
  const config = configureDOMPurify(purify)

  return purify.sanitize(html, config)
}

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
