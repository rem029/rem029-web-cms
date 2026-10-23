// The Ordering tab's QR panel on the server (rem0018 phase 1 steps 1b and 1c,
// src/collections/Menus/utils/tables.ts): the menu's own tables, read as the user.
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { listMenuTables } from '@/collections/Menus/utils/tables'
import type { Tenant } from '@/payload-types'

import { getTestPayload } from '../common/payload'
import { TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'
import { loadUser, type SessionUser } from '../common/users'

const context = { disableRevalidate: true }

describe('menu tables', () => {
  let payload: Payload
  let tenantA: Tenant
  let tenantB: Tenant
  let member: SessionUser

  beforeAll(async () => {
    payload = await getTestPayload()
    tenantA = await findTenant(payload, TEST_TENANTS.a)
    tenantB = await findTenant(payload, TEST_TENANTS.b)
    member = await loadUser(payload, TEST_USERS.member)
  })

  it("lists only the menu's own tables", async () => {
    // arrange: two test-a menus, table A on the first, table B on the second
    const menu = await payload.create({
      collection: 'menus',
      data: { title: uniqueName('Menu'), tenant: tenantA.id, _status: 'published' },
      draft: false,
      context,
    })
    const otherMenu = await payload.create({
      collection: 'menus',
      data: { title: uniqueName('Other Menu'), tenant: tenantA.id, _status: 'published' },
      draft: false,
      context,
    })
    const tableA = await payload.create({
      collection: 'tables',
      data: { label: uniqueName('Table A'), tenant: tenantA.id, menu: menu.id },
      locale: 'en',
      context,
    })
    const tableB = await payload.create({
      collection: 'tables',
      data: { label: uniqueName('Table B'), tenant: tenantA.id, menu: otherMenu.id },
      locale: 'en',
      context,
    })

    // act: listMenuTables(payload, member, { menuId })
    const result = await listMenuTables(payload, member, { menuId: menu.id })

    // assert: ok with the menu's slug; tables contains A, not B
    expect(result).toMatchObject({ ok: true, menuSlug: menu.slug })
    const tables = result.ok ? result.tables.map((t) => t.id) : []
    expect(tables).toContain(tableA.id)
    expect(tables).not.toContain(tableB.id)
  })

  it("refuses another tenant's menu", async () => {
    // arrange: a test-b menu
    const menuB = await payload.create({
      collection: 'menus',
      data: { title: uniqueName('Menu B'), tenant: tenantB.id, _status: 'published' },
      draft: false,
      overrideAccess: true,
      context,
    })

    // act: listMenuTables as the member of test-a
    const result = await listMenuTables(payload, member, { menuId: menuB.id })

    // assert: { ok: false }
    expect(result).toMatchObject({ ok: false })
  })
})
