/** The fixture names tests read; what each one is, is set up in this folder's seeds. */

export const TEST_TENANTS = {
  a: 'test-a',
  b: 'test-b',
  // no members: a business nobody in the seed belongs to
  c: 'test-c',
} as const

/** The profiles each test business has (slugs are unique per tenant, the same in each). */
export const TEST_PROFILES = {
  // CRUD on pages, posts, media, categories; read/update on header and footer; opens /admin
  editor: 'editor',
  // read on pages, posts, media, categories, header and footer; opens /admin
  viewer: 'viewer',
} as const

export const TEST_USERS = {
  superUser: 'super@example.test',
  // tenant admin of test-a
  tenantAdmin: 'admin-a@example.test',
  // editor in test-a
  member: 'member-a@example.test',
  // viewer in test-a
  viewer: 'viewer-a@example.test',
  // the platform `default` profile in test-a (opens /admin, nothing else)
  defaultProfile: 'default-a@example.test',
  // editor in test-b only
  otherTenant: 'member-b@example.test',
  // editor in test-a and test-b
  multiTenant: 'member-ab@example.test',
  // editor in test-a, viewer in test-b, not in test-c
  mixed: 'mixed-ab@example.test',
  // editor in test-a, is_disabled
  disabled: 'disabled-a@example.test',
} as const

/** Ids of what one seed creates, by fixture key, for the seeds that run after it. */
export type TenantIds = Record<keyof typeof TEST_TENANTS, number>

/** Profile ids per business that has profiles (test-c has none). */
export type ProfileIds = Record<keyof typeof TEST_PROFILES, Record<'a' | 'b', number>>
