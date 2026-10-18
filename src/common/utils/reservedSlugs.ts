/**
 * Page slugs that would never render because a route of their own takes the url first
 * (`/forms/<slug>` for rem0016; rem0017 adds `menu`). Pages refuse them.
 */
export const RESERVED_PAGE_SLUGS = ['admin', 'api', 'next', 'forms', 'posts', 'search'] as const

/** Payload `validate` for the Pages slug: refuses a reserved slug. */
export const validatePageSlug = (value: unknown): true | string => {
  if (typeof value !== 'string' || !value) return true
  const slug = value.toLowerCase()
  return RESERVED_PAGE_SLUGS.some((reserved) => reserved === slug)
    ? `"${value}" is used by the site itself (/${slug}/…). Pick another slug.`
    : true
}
