/** The fixture names tests read; what each one is, is set up in this folder's seeds. */

export const TEST_TENANTS = {
  a: 'test-a',
  b: 'test-b',
  // no members: a business nobody in the seed belongs to
  c: 'test-c',
  // inactive (`isActive` false): read-only for its members, with an editor and a tenant admin
  inactive: 'test-inactive',
} as const

/** The profiles each test business has (slugs are unique per tenant, the same in each). */
export const TEST_PROFILES = {
  // CRUD on pages, posts, media, categories, the menu catalog; read/update on header and footer;
  // opens /admin
  editor: 'editor',
  // read on pages, posts, media, categories, the menu catalog, header and footer; opens /admin
  viewer: 'viewer',
} as const

export const TEST_USERS = {
  superUser: 'super@example.test',
  // tenant admin of test-a
  tenantAdmin: 'admin-a@example.test',
  // tenant admin of test-a and test-b (the only one of test-b)
  owner: 'owner-ab@example.test',
  // editor in test-a
  member: 'member-a@example.test',
  // viewer in test-a
  viewer: 'viewer-a@example.test',
  // the platform `pages-editor` template in test-a
  templateEditor: 'template-a@example.test',
  // the platform `default` profile in test-a (opens /admin, nothing else)
  defaultProfile: 'default-a@example.test',
  // editor in test-b only
  otherTenant: 'member-b@example.test',
  // viewer in test-b only
  otherViewer: 'viewer-b@example.test',
  // editor in test-a and test-b
  multiTenant: 'member-ab@example.test',
  // editor in test-a, viewer in test-b, not in test-c
  mixed: 'mixed-ab@example.test',
  // editor in test-a, is_disabled
  disabled: 'disabled-a@example.test',
  // editor in test-inactive only
  inactiveMember: 'member-inactive@example.test',
  // tenant admin of test-inactive only
  inactiveAdmin: 'admin-inactive@example.test',
} as const

/** Ids of what one seed creates, by fixture key, for the seeds that run after it. */
export type TenantIds = Record<keyof typeof TEST_TENANTS, number>

/** Profile ids per business that has profiles (test-c has none). */
export type ProfileIds = Record<keyof typeof TEST_PROFILES, Record<'a' | 'b' | 'inactive', number>>

/**
 * Public site content (`content.ts`): the same slugs in several businesses, so a public read that
 * returns another business's doc is easy to spot.
 */
export const TEST_CONTENT = {
  // a published post in admin, test-a and test-b
  welcomePost: 'welcome',
  // a published page in test-a only
  onlyInA: 'only-in-a',
  // a redirect in test-a only, and one in admin
  redirectInA: '/redirect-in-a',
  redirectInAdmin: '/redirect-in-admin',
  // test-a's custom domain (`tenants.domains`)
  domainOfA: 'shop-a.example.test',
  // test-b's Settings → Homepage (admin has no homepage picked: its `home` page is the fallback)
  homepageOfB: 'about',
} as const

/**
 * The menu catalog (`menu.ts`, rem0017): the same slugs in test-a and test-b, so a read that
 * returns another business's doc is easy to spot. Titles have an Arabic version.
 */
export const TEST_MENU = {
  // categories in test-a and test-b, sortOrder 1 and 2
  starters: 'starters',
  mains: 'mains',
  // an allergen and a tag in test-a and test-b
  gluten: 'Gluten',
  vegan: 'Vegan',
  // items in test-a and test-b: soup (starters, gluten), steak (mains), lemonade (no category)
  soup: 'tomato-soup',
  steak: 'grilled-steak',
  lemonade: 'fresh-lemonade',
  // an item in test-a only, "Show on menus" unticked
  inactiveItem: 'seasonal-special',
} as const

/** The active theme of test-a and test-b, so their branding differs. */
export const TEST_THEMES = {
  a: { name: 'Ocean', primary: '#1d4ed8' },
  b: { name: 'Sunset', primary: '#b4232c', font: 'Urbanist' },
} as const
