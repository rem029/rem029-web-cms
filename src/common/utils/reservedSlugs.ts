/**
 * Page slugs that would never render because a route of their own takes the url first
 * (`/forms/<slug>` for rem0016, `/menu` and `/menu/<slug>` for rem0017). Pages refuse them.
 * rem0016 has the same file on its branch: whichever merges second keeps both entries.
 */
export const RESERVED_PAGE_SLUGS = [
  'admin',
  'api',
  'next',
  'forms',
  'menu',
  'posts',
  'search',
] as const

/** Payload `validate` for the Pages slug: refuses a reserved slug. */
export const validatePageSlug = (value: unknown): true | string => {
  // 1. not a string or empty → true (the slug field's own rules apply)
  // 2. RESERVED_PAGE_SLUGS includes value.toLowerCase() →
  //    `"<value>" is used by the site itself (/<value>/…). Pick another slug.`
  // 3. else true
  void value
  throw new Error('validatePageSlug: not implemented')
}
