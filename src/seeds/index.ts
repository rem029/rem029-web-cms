/**
 * Main seed entry point for local and dev environments.
 * Runs seed scripts in dependency order.
 *
 *   pnpm seed
 *
 * Add new seeds to this list in dependency order.
 * Refuses to run in production.
 */
import config from '@payload-config'
import { getPayload } from 'payload'

import { seedAccess } from './access'
import { seedDefaultAdmin } from './defaultAdmin'
import { seedMultiTenancy } from './multiTenancy'

if (process.env.NODE_ENV === 'production') {
  console.error('seed: refusing to run with NODE_ENV=production')
  process.exit(1)
}

const seeds = [
  { name: 'defaultAdmin', run: seedDefaultAdmin },
  { name: 'access', run: seedAccess },
  { name: 'multiTenancy', run: seedMultiTenancy },
]

const payload = await getPayload({ config })

for (const { name, run } of seeds) {
  try {
    await run(payload)
    payload.logger.info(`seed: ${name} done`)
  } catch (err) {
    payload.logger.error({ msg: `seed: ${name} failed`, err })
    process.exit(1)
  }
}

process.exit(0)
