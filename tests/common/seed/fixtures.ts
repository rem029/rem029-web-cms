/** The fixture names tests read; what each one is, is set up in this folder's seeds. */

export const TEST_TENANTS = {
  a: 'test-a',
  b: 'test-b',
} as const

export const TEST_PROFILE = 'editor'

export const TEST_USERS = {
  superUser: 'super@example.test',
  // tenant admin of test-a
  tenantAdmin: 'admin-a@example.test',
  // editor in test-a
  member: 'member-a@example.test',
  // editor in test-b only
  otherTenant: 'member-b@example.test',
  // editor in test-a, is_disabled
  disabled: 'disabled-a@example.test',
} as const

/** Ids of what one seed creates, by fixture key, for the seeds that run after it. */
export type TenantIds = Record<keyof typeof TEST_TENANTS, number>
