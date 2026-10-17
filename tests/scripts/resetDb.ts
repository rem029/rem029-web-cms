/**
 * Rebuilds the test database: empty schema → every migration → the test seed.
 *
 *   pnpm test:db:reset   (also run by tests/common/globalSetup.ts before every `pnpm test`)
 *
 * Refuses anything but a `*_test` database with NODE_ENV=test (tests/common/env.ts).
 */
import { sql } from '@payloadcms/db-postgres'
import config from '@payload-config'
import { getPayload } from 'payload'

import { migrations } from '@/migrations'

import { assertTestDatabase } from '../common/env'
import { seedTestData } from '../common/seed'

assertTestDatabase()

// a missing db is created on connect; an unreachable server makes the adapter log and exit 1
const payload = await getPayload({ config })

try {
  await payload.db.drizzle.execute(sql.raw('DROP SCHEMA public CASCADE; CREATE SCHEMA public'))
  await payload.db.migrate()
  await seedTestData(payload)
  payload.logger.info(`tests: test db reset (${migrations.length} migrations)`)
  process.exit(0)
} catch (err) {
  payload.logger.error({ msg: 'tests: test db reset failed', err })
  process.exit(1)
}
