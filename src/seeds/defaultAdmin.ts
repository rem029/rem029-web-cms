/**
 * Default super user for local/dev environments.
 *
 *   pnpm seed:admin
 *
 * - Uses SEED_ADMIN_EMAIL (default default@payload.com) and SEED_ADMIN_PASSWORD (min 12 chars).
 *   The password is never logged.
 * - Super user and member of the default tenant. Idempotent: skips if the email exists.
 * - Refuses to run in production.
 */
import config from '@payload-config'
import type { Payload } from 'payload'
import { getPayload } from 'payload'

import { DEFAULT_TENANT_SLUG } from '@/common/utils/defaultTenant'
import { getSeedAdminCredentials } from '@/common/utils/seedAdmin'

const seed = async (payload: Payload) => {
  const credentials = getSeedAdminCredentials()
  if (!credentials) {
    throw new Error('SEED_ADMIN_PASSWORD is not set (min 12 chars)')
  }

  const { totalDocs } = await payload.count({
    collection: 'users',
    where: { email: { equals: credentials.email } },
  })
  if (totalDocs > 0) {
    payload.logger.info(`seed: default admin ${credentials.email} already exists`)
    return
  }

  const { docs } = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: DEFAULT_TENANT_SLUG } },
    limit: 1,
    depth: 0,
  })
  if (!docs[0]) {
    throw new Error(`default tenant "${DEFAULT_TENANT_SLUG}" not found, run migrations first`)
  }

  await payload.create({
    collection: 'users',
    data: {
      email: credentials.email,
      password: credentials.password,
      name: 'Default admin',
      super_user: true,
      tenants: [{ tenant: docs[0].id }],
    },
  })
  payload.logger.info(`seed: created default admin ${credentials.email} (super user)`)
}

if (process.env.NODE_ENV === 'production') {
  console.error('seed: refusing to run with NODE_ENV=production')
  process.exit(1)
}

const payload = await getPayload({ config })
try {
  await seed(payload)
  process.exit(0)
} catch (err) {
  payload.logger.error({ msg: 'seed: default admin seed failed', err })
  process.exit(1)
}
