/** The test businesses (`TEST_TENANTS`), active. */
import type { Payload } from 'payload'

import { TEST_TENANTS, type TenantIds } from './fixtures'

const upsertTenant = async (payload: Payload, slug: string): Promise<number> => {
  const { docs } = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
  })

  if (docs[0]) {
    const updated = await payload.update({
      collection: 'tenants',
      id: docs[0].id,
      data: { name: slug, isActive: true },
      locale: 'en',
      context: { disableRevalidate: true },
    })
    payload.logger.info(`test seed: updated tenant ${slug}`)
    return updated.id
  }

  const created = await payload.create({
    collection: 'tenants',
    data: { name: slug, slug, isActive: true },
    locale: 'en',
    context: { disableRevalidate: true },
  })
  payload.logger.info(`test seed: created tenant ${slug}`)
  return created.id
}

export const seedTestTenants = async (payload: Payload): Promise<TenantIds> => ({
  a: await upsertTenant(payload, TEST_TENANTS.a),
  b: await upsertTenant(payload, TEST_TENANTS.b),
  c: await upsertTenant(payload, TEST_TENANTS.c),
})
