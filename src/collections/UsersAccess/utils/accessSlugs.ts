import { FEATURE_SLUG_VALUES } from '@/common/utils/featureSlugs'

// super users only by rule (rem0002): a profile row would do nothing
const NOT_GRANTABLE_GLOBALS = ['audit-logs-settings']

// internal, no access for anyone (rem0018): a profile row would do nothing
const NOT_GRANTABLE_COLLECTIONS = ['order-counters']

/**
 * The slugs a profile has rows for: collections except Payload's own (`payload-*`) and `order-counters`, globals
 * except `audit-logs-settings`, then the feature slugs (`FEATURE_SLUGS`: the staff boards,
 * rem0018 phase 1 step 2). Single source of truth for which slugs a profile has rows for.
 */
export const getAccessSlugs = (
  collections: { slug: string }[],
  globals: { slug: string }[],
): string[] => [
  ...collections.map((c) => c.slug).filter((slug) => !slug.startsWith('payload-') && !NOT_GRANTABLE_COLLECTIONS.includes(slug)),
  ...globals.map((g) => g.slug).filter((slug) => !NOT_GRANTABLE_GLOBALS.includes(slug)),
  ...FEATURE_SLUG_VALUES,
]
