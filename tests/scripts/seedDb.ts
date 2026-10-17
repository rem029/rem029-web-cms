/**
 * Re-runs only the test seed on the current test database.
 *
 *   pnpm test:db:seed
 */
import config from '@payload-config'
import { getPayload } from 'payload'

import { assertTestDatabase } from '../common/env'
import { seedTestData } from '../common/seed'

assertTestDatabase()

// a missing db is created on connect; an unreachable server makes the adapter log and exit 1
const payload = await getPayload({ config })

try {
  await seedTestData(payload)
  payload.logger.info('tests: test seed done')
  process.exit(0)
} catch (err) {
  payload.logger.error({ msg: 'tests: test seed failed', err })
  process.exit(1)
}
