/**
 * Page slugs that would never render because a route of their own takes the url first
 * (`/forms/<slug>` for rem0016; rem0017 adds `menu`). Pages refuse them.
 */
export const RESERVED_PAGE_SLUGS = ['admin', 'api', 'next', 'forms', 'posts', 'search'] as const

/** Payload `validate` for the Pages slug: refuses a reserved slug. */
export const validatePageSlug = (value: unknown): true | string => {
  // 1. not a string or empty → true (the slug field's own rules apply)
  // 2. RESERVED_PAGE_SLUGS includes value.toLowerCase() →
  //    `"<value>" is used by the site itself (/<value>/…). Pick another slug.`
  // 3. else true
  void value
  throw new Error('validatePageSlug: not implemented')
}
