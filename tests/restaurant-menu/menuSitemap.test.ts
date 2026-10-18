// The menu sitemap (rem0017 phase 3 step 4, listMenuSitemap in
// `src/app/(frontend)/menu/_data/menuSitemap.ts`): `/menu` and every published menu of the host
// tenant, nothing for a tenant without menus, fail closed without a tenant.
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { listMenuSitemap } from '@/app/(frontend)/menu/_data/menuSitemap'
import type { Tenant } from '@/payload-types'

import { getTestPayload } from '../common/payload'
import { TEST_MENU, TEST_TENANTS } from '../common/seed'
import { findTenant } from '../common/tenants'

const SITE = 'https://test-a.example.com'

describe('menu sitemap', () => {
  let payload: Payload
  let tenantA: Tenant
  let tenantC: Tenant

  beforeAll(async () => {
    payload = await getTestPayload()
    tenantA = await findTenant(payload, TEST_TENANTS.a)
    tenantC = await findTenant(payload, TEST_TENANTS.c)
  })

  it('lists the menu list and each published menu', async () => {
    // act
    const entries = await listMenuSitemap(payload, tenantA.id, SITE)

    // assert
    const locs = entries.map((entry) => entry.loc)
    expect(locs).toContain(`${SITE}/menu`)
    expect(locs).toContain(`${SITE}/menu/${TEST_MENU.dinner}`)
  })

  it('leaves out drafts and other tenants menus', async () => {
    // act
    const entries = await listMenuSitemap(payload, tenantA.id, SITE)

    // assert
    const locs = entries.map((entry) => entry.loc)
    expect(locs).not.toContain(`${SITE}/menu/${TEST_MENU.draftMenu}`)
    expect(locs).not.toContain(`${SITE}/menu/${TEST_MENU.onlyInB}`)
  })

  it('dates each menu by its last update', async () => {
    // arrange
    const { docs } = await payload.find({
      collection: 'menus',
      where: { tenant: { equals: tenantA.id }, slug: { equals: TEST_MENU.dinner } },
      depth: 0,
      limit: 1,
    })

    // act
    const entries = await listMenuSitemap(payload, tenantA.id, SITE)

    // assert
    const dinner = entries.find((entry) => entry.loc === `${SITE}/menu/${TEST_MENU.dinner}`)
    expect(dinner?.lastmod).toBe(docs[0]?.updatedAt)
  })

  it('lists nothing for a tenant without menus', async () => {
    // act
    const entries = await listMenuSitemap(payload, tenantC.id, SITE)

    // assert
    expect(entries).toEqual([])
  })

  it('returns nothing without a tenant', async () => {
    // act
    const entries = await listMenuSitemap(payload, null, SITE)

    // assert
    expect(entries).toEqual([])
  })
})
