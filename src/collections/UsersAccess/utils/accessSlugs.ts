// super users only by rule (rem0002): a profile row would do nothing
const NOT_GRANTABLE_GLOBALS = ['audit-logs-settings']

/**
 * The slugs a profile has rows for: collections except Payload's own (`payload-*`), and globals
 * except `audit-logs-settings`. Single source of truth for which slugs a profile has rows for.
 */
export const getAccessSlugs = (
  collections: { slug: string }[],
  globals: { slug: string }[],
): string[] => [
  ...collections.map((c) => c.slug).filter((slug) => !slug.startsWith('payload-')),
  ...globals.map((g) => g.slug).filter((slug) => !NOT_GRANTABLE_GLOBALS.includes(slug)),
]
