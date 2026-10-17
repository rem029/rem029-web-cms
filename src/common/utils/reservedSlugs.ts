/**
 * Page slugs that would never render because a route of their own takes the url first
 * (`/forms/<slug>` for rem0016, `/menu` and `/menu/<slug>` for rem0017). Pages refuse them.
 * rem0016 has the same file on its branch: whichever merges second keeps both entries.
 */
export const RESERVED_PAGE_SLUGS: readonly string[] = [
  'admin',
  'api',
  'next',
  'forms',
  'menu',
  'posts',
  'search',
]

/** Payload `validate` for the Pages slug: refuses a reserved slug. */
export const validatePageSlug = (value: unknown): true | string => {
  if (typeof value !== 'string' || !value) return true
  if (!RESERVED_PAGE_SLUGS.includes(value.toLowerCase())) return true
  return `"${value}" is used by the site itself (/${value}/…). Pick another slug.`
}
