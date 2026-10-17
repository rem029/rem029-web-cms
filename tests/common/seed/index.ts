/**
 * The test seed: the shared fixtures every test can read. Separate from `src/seeds` (dev data), so
 * dev seeds can change without breaking tests. Run by `tests/scripts/resetDb.ts` after the
 * migrations, or alone with `pnpm test:db:seed`.
 *
 * One file per kind of fixture (`tenants.ts`, `profiles.ts`, `users.ts`), run in dependency order
 * by `seedTestData`; the names tests read are in `fixtures.ts`.
 *
 * - Four businesses (`test-a`, `test-b`, `test-c` without members, and the inactive `test-inactive`) on
 *   top of what the migrations create (the `admin` tenant,
 *   the `default` profile and the platform templates).
 * - An `editor` and a `viewer` profile in test-a, test-b and test-inactive (`TEST_PROFILES`, see
 *   `profiles.ts`).
 * - One user per role (`TEST_USERS`), each logging in with their email as the password.
 * - Public site content for the tenant-frontend tests (`TEST_CONTENT`, `TEST_THEMES`, see
 *   `content.ts`): posts, pages and redirects with the same slugs in several businesses, a custom
 *   domain, test-b's homepage and two themes.
 * - The menu catalog (`TEST_MENU`, see `menu.ts`): categories, an allergen, a tag and items with
 *   the same slugs in test-a and test-b, plus an inactive item in test-a.
 * - Idempotent: upserts tenants and profiles by slug (+ tenant), users by email, so a re-run
 *   converges on these definitions.
 * - Tests never change these fixtures: a test that writes creates its own docs with unique names.
 *   A feature that needs new fixtures extends a file here (or adds one and calls it from
 *   `seedTestData`) and names them in `fixtures.ts`.
 */
import type { Payload } from 'payload'

import { seedTestContent } from './content'
import { seedTestMenu } from './menu'
import { seedTestProfiles } from './profiles'
import { seedTestTenants } from './tenants'
import { seedTestUsers } from './users'

export {
  TEST_CONTENT,
  TEST_MENU,
  TEST_PROFILES,
  TEST_TENANTS,
  TEST_THEMES,
  TEST_USERS,
} from './fixtures'

export const seedTestData = async (payload: Payload): Promise<void> => {
  const tenants = await seedTestTenants(payload)
  const profiles = await seedTestProfiles(payload, tenants)
  await seedTestUsers(payload, tenants, profiles)
  await seedTestContent(payload, tenants)
  await seedTestMenu(payload, tenants)
}
