/**
 * Inactive tenants test data (rem0001 phase 7).
 * Sets tenant3 to inactive (isActive: false). Members of inactive tenants
 * have read-only access to their content and cannot update their tenant name.
 *
 *   pnpm seed
 *
 * Idempotent: sets isActive: false only if not already inactive.
 */
import type { Payload } from 'payload'

export const seedInactiveTenants = async (payload: Payload): Promise<void> => {
  const { docs: tenants } = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: 'tenant3' } },
    limit: 1,
    depth: 0,
  })

  const tenant = tenants[0]
  if (!tenant) {
    throw new Error('seed: tenant3 not found; run multiTenancy first')
  }

  if (tenant.isActive === false) {
    payload.logger.info('seed: tenant3 already inactive')
    return
  }

  await payload.update({
    collection: 'tenants',
    id: tenant.id,
    data: { isActive: false },
  })
  payload.logger.info('seed: tenant3 set inactive')
}
