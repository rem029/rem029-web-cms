// The tenant's menu currency on Settings (rem0017 phase 1 step 1): prices on every menu of the
// tenant are shown in it.
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import type { Setting, Tenant } from '@/payload-types'

import { getTestPayload } from '../common/payload'
import { TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { loadUser } from '../common/users'

const context = { disableRevalidate: true }

describe('settings currency', () => {
  let payload: Payload

  const settingsOf = async (tenant: Tenant): Promise<Setting> => {
    const { docs } = await payload.find({
      collection: 'settings',
      where: { tenant: { equals: tenant.id } },
      limit: 1,
      depth: 0,
    })
    if (!docs[0]) throw new Error(`tests: no settings in ${tenant.slug}`)
    return docs[0]
  }

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  it('defaults the currency to USD', async () => {
    // arrange
    const tenantC = await findTenant(payload, TEST_TENANTS.c)

    // act
    const settings = await settingsOf(tenantC)

    // assert
    expect(settings.currency).toBe('USD')
  })

  it('lets a tenant admin change the currency', async () => {
    // arrange
    const tenantA = await findTenant(payload, TEST_TENANTS.a)
    const tenantAdmin = await loadUser(payload, TEST_USERS.tenantAdmin)
    const before = await settingsOf(tenantA)

    // act
    await payload.update({
      collection: 'settings',
      id: before.id,
      data: { currency: 'QAR' },
      user: tenantAdmin,
      overrideAccess: false,
      context,
    })

    // assert
    expect((await settingsOf(tenantA)).currency).toBe('QAR')
    await payload.update({
      collection: 'settings',
      id: before.id,
      data: { currency: before.currency ?? 'USD' },
      context,
    })
  })
})
