/**
 * Default super user for local/dev environments.
 *
 *   pnpm seed
 *
 * - Uses SEED_ADMIN_EMAIL (default default@payload.com) and SEED_ADMIN_PASSWORD (min 12 chars).
 *   The password is never logged.
 * - Super user and member of the default tenant. Idempotent: skips if the email exists.
 * - Never runs in production (src/seeds/index.ts refuses).
 */
import type { Payload } from 'payload'

import { DEFAULT_TENANT_SLUG } from '@/common/utils/defaultTenant'
import { getSeedAdminCredentials } from '@/common/utils/seedAdmin'

export const seedDefaultAdmin = async (payload: Payload) => {
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
