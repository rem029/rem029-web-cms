// Who may read and write the menu catalog (rem0017 phase 1 step 1): categories, allergens, tags
// and items are tenant-scoped and read their access from the user's profile on that tenant's row.
// Uses the seeded editor/viewer profiles (extended with the catalog slugs) and TEST_MENU fixtures.
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { extractTenantId } from '@/common/utils/tenantCollections'
import type { Tenant } from '@/payload-types'

import { getTestPayload } from '../common/payload'
import { TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'
import { loadUser, type SessionUser } from '../common/users'

const CATALOG = ['menu-categories', 'menu-allergens', 'menu-tags', 'menu-items'] as const
const LOOKUPS = ['menu-categories', 'menu-allergens', 'menu-tags'] as const

type CatalogSlug = (typeof CATALOG)[number]

describe('menu catalog access', () => {
  let payload: Payload
  let tenantA: Tenant
  let tenantB: Tenant
  let inactive: Tenant

  // the smallest valid doc of each collection, created as `user` in `tenantId`
  const createAs = (slug: CatalogSlug, tenantId: number, user: SessionUser) => {
    const title = uniqueName('catalog-access')
    const base = { user, overrideAccess: false } as const
    const creates = {
      'menu-categories': () =>
        payload.create({
          ...base,
          collection: 'menu-categories',
          data: { title, tenant: tenantId },
        }),
      'menu-allergens': () =>
        payload.create({
          ...base,
          collection: 'menu-allergens',
          data: { title, tenant: tenantId },
        }),
      'menu-tags': () =>
        payload.create({ ...base, collection: 'menu-tags', data: { title, tenant: tenantId } }),
      'menu-items': () =>
        payload.create({
          ...base,
          collection: 'menu-items',
          data: { title, price: 1, tenant: tenantId },
        }),
    }
    return creates[slug]()
  }

  beforeAll(async () => {
    payload = await getTestPayload()
    tenantA = await findTenant(payload, TEST_TENANTS.a)
    tenantB = await findTenant(payload, TEST_TENANTS.b)
    inactive = await findTenant(payload, TEST_TENANTS.inactive)
  })

  describe('members', () => {
    it.each(CATALOG)('lets an editor create %s in their tenant', async (slug) => {
      // arrange
      const member = await loadUser(payload, TEST_USERS.member)

      // act
      const doc = await createAs(slug, tenantA.id, member)

      // assert
      expect(extractTenantId(doc.tenant)).toBe(tenantA.id)
    })

    it.each(CATALOG)('hides %s of other tenants from members', async (slug) => {
      // arrange
      const otherTenant = await loadUser(payload, TEST_USERS.otherTenant)

      // act
      const { docs } = await payload.find({
        collection: slug,
        user: otherTenant,
        overrideAccess: false,
        depth: 0,
        pagination: false,
      })

      // assert
      expect(docs.length).toBeGreaterThan(0)
      expect([...new Set(docs.map((doc) => extractTenantId(doc.tenant)))]).toEqual([tenantB.id])
    })

    it.each(CATALOG)('denies %s writes to a viewer', async (slug) => {
      // arrange
      const viewer = await loadUser(payload, TEST_USERS.viewer)

      // act / assert
      await expect(createAs(slug, tenantA.id, viewer)).rejects.toMatchObject({ status: 403 })
    })

    it.each(CATALOG)('denies %s to a disabled user', async (slug) => {
      // arrange
      const disabled = await loadUser(payload, TEST_USERS.disabled)

      // act / assert
      await expect(
        payload.find({ collection: slug, user: disabled, overrideAccess: false, depth: 0 }),
      ).rejects.toMatchObject({ status: 403 })
    })

    it.each(CATALOG)('refuses %s writes in an inactive tenant', async (slug) => {
      // arrange
      const inactiveMember = await loadUser(payload, TEST_USERS.inactiveMember)

      // act / assert
      await expect(createAs(slug, inactive.id, inactiveMember)).rejects.toMatchObject({
        status: 403,
      })
    })
  })

  describe('anonymous', () => {
    it.each(LOOKUPS)('reads %s anonymously', async (slug) => {
      // act
      const { docs } = await payload.find({
        collection: slug,
        where: { tenant: { equals: tenantA.id } },
        overrideAccess: false,
        depth: 0,
        pagination: false,
      })

      // assert
      expect(docs.length).toBeGreaterThan(0)
    })
  })
})
