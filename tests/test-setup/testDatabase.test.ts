import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { migrations } from '@/migrations'
import type { Tenant } from '@/payload-types'

import { getTestPayload } from '../common/payload'
import { TEST_TENANTS, TEST_USERS } from '../common/seed'
import { loadUser } from '../common/users'

const isTenant = (t: number | Tenant): t is Tenant => typeof t === 'object' && t !== null

describe('test database', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  it('has every migration applied', async () => {
    // arrange
    const expected = migrations.map((m) => m.name).sort()

    // act
    const result = await payload.find({
      collection: 'payload-migrations',
      limit: 0,
      pagination: false,
      depth: 0,
    })

    // assert
    const applied = result.docs
      .map((doc) => doc.name)
      .filter((name): name is string => typeof name === 'string' && name !== 'dev')
      .sort()
    expect(applied).toEqual(expected)
  })

  it('has the test businesses', async () => {
    // arrange
    const slugs = [TEST_TENANTS.a, TEST_TENANTS.b]

    // act
    const result = await payload.find({
      collection: 'tenants',
      where: { slug: { in: slugs } },
      limit: 0,
      pagination: false,
      depth: 0,
    })

    // assert
    expect(result.docs.map((doc) => doc.slug).sort()).toEqual(['test-a', 'test-b'])
    expect(result.docs.map((doc) => doc.isActive)).toEqual([true, true])
  })

  it.each([
    ['superUser', TEST_TENANTS.a],
    ['tenantAdmin', TEST_TENANTS.a],
    ['member', TEST_TENANTS.a],
    ['otherTenant', TEST_TENANTS.b],
    ['multiTenant', TEST_TENANTS.b],
    ['disabled', TEST_TENANTS.a],
  ] as const)('has the %s user', async (role, tenantSlug) => {
    // arrange
    const email = TEST_USERS[role]

    // act
    const user = await loadUser(payload, email)

    // assert
    expect(user.email).toBe(email)
    const slugs = (user.tenants ?? [])
      .map((row) => row.tenant)
      .filter(isTenant)
      .map((tenant) => tenant.slug)
    expect(slugs).toContain(tenantSlug)
  })

  it('has no dev seed data', async () => {
    // arrange + act
    const tenants = await payload.find({
      collection: 'tenants',
      where: { slug: { equals: 'tenant1' } },
      limit: 1,
      depth: 0,
    })
    const users = await payload.find({
      collection: 'users',
      where: { email: { equals: 'default@example.test' } },
      limit: 1,
      depth: 0,
    })

    // assert
    expect(tenants.totalDocs).toBe(0)
    expect(users.totalDocs).toBe(0)
  })
})
