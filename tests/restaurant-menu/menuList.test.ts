// The /menu list (rem0017 phase 3 step 2, listMenus in `src/app/(frontend)/menu/_data/menuData.ts`):
// the host tenant's published menus only, fail closed without a tenant.
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { listMenus } from '@/app/(frontend)/menu/_data/menuData'
import { extractTenantId } from '@/common/utils/tenantCollections'
import type { Tenant } from '@/payload-types'

import { getTestPayload } from '../common/payload'
import { TEST_MENU, TEST_TENANTS } from '../common/seed'
import { findTenant } from '../common/tenants'

describe('menu list', () => {
  let payload: Payload
  let tenantA: Tenant

  beforeAll(async () => {
    payload = await getTestPayload()
    tenantA = await findTenant(payload, TEST_TENANTS.a)
  })

  it('lists only the host tenant menus', async () => {
    // act
    const menus = await listMenus(payload, tenantA.id, { locale: 'en' })

    // assert
    expect(menus.map((menu) => menu.slug)).toContain(TEST_MENU.dinner)
    expect(menus.map((menu) => menu.slug)).not.toContain(TEST_MENU.onlyInB)
    expect(menus.every((menu) => extractTenantId(menu.tenant) === tenantA.id)).toBe(true)
  })

  it('leaves out draft menus', async () => {
    // act
    const menus = await listMenus(payload, tenantA.id, { locale: 'en' })

    // assert
    expect(menus.map((menu) => menu.slug)).not.toContain(TEST_MENU.draftMenu)
  })

  it('sorts menus by title', async () => {
    // act
    const menus = await listMenus(payload, tenantA.id, { locale: 'en' })

    // assert
    const titles = menus.map((menu) => menu.title.toLowerCase())
    expect(titles).toEqual([...titles].sort())
  })

  it('returns nothing without a tenant', async () => {
    // act
    const menus = await listMenus(payload, null, { locale: 'en' })

    // assert
    expect(menus).toEqual([])
  })
})
