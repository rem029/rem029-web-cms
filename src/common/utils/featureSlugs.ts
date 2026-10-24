/**
 * Access slugs that are not collections or globals (rem0018 phase 1 step 2): one profile row per
 * staff board. `read` ticked = the user works that board. Profiles offer them after the
 * collections and globals (`getAccessSlugs`); tenant admins get them by default (`tenantAdminAllows`).
 * Phase 5 adds `orders-report` the same way.
 */
export const FEATURE_SLUGS = [
  { value: 'order-waiter', label: 'Waiter board' },
  { value: 'order-kitchen', label: 'Kitchen board' },
  { value: 'order-cashier', label: 'Cashier board' },
] as const

export type FeatureSlug = (typeof FEATURE_SLUGS)[number]['value']

export const FEATURE_SLUG_VALUES: FeatureSlug[] = FEATURE_SLUGS.map((feature) => feature.value)

export const isFeatureSlug = (slug: string): slug is FeatureSlug =>
  FEATURE_SLUG_VALUES.some((value) => value === slug)
