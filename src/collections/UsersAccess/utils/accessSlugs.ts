/**
 * Returns collection slugs excluding Payload internal collections (starting with `payload-`).
 * Single source of truth for which slugs a profile has rows for.
 */
export const getAccessSlugs = (collections: { slug: string }[]): string[] => {
  return collections.map((c) => c.slug).filter((slug) => !slug.startsWith('payload-'))
}
