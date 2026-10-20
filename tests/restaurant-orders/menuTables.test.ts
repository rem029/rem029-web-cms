// The Ordering tab's QR panel on the server (rem0018 phase 1 step 1b,
// src/collections/Menus/utils/tables.ts): the menu's tables, the tenant's other tables, and
// "Add existing tables", all as the user.
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { addTablesToMenu, listMenuTables } from '@/collections/Menus/utils/tables'
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
  let viewer: SessionUser

  beforeAll(async () => {
    payload = await getTestPayload()
    tenantA = await findTenant(payload, TEST_TENANTS.a)
    tenantB = await findTenant(payload, TEST_TENANTS.b)
    member = await loadUser(payload, TEST_USERS.member)
    viewer = await loadUser(payload, TEST_USERS.viewer)
  })

  it("lists the menu's tables and the tenant's other tables", async () => {
    // arrange: a test-a menu, table A on it, table B not
    const menu = await payload.create({
      collection: 'menus',
      data: {
        title: uniqueName('Menu'),
        tenant: tenantA.id,
        _status: 'published',
      },
      draft: false,
      context,
    })
    const tableA = await payload.create({
      collection: 'tables',
      data: {
        label: uniqueName('Table A'),
        tenant: tenantA.id,
        menus: [menu.id],
      },
      locale: 'en',
      context,
    })
    const tableB = await payload.create({
      collection: 'tables',
      data: {
        label: uniqueName('Table B'),
        tenant: tenantA.id,
      },
      locale: 'en',
      context,
    })

    // act: listMenuTables(payload, member, { menuId })
    const result = await listMenuTables(payload, member, { menuId: menu.id })

    // assert: tables contains A only, otherTables contains B, menuSlug is the slug
    expect(result).toMatchObject({
      ok: true,
      menuSlug: menu.slug,
    })
    const tables = result.ok ? result.tables.map((t) => t.id) : []
    const otherTables = result.ok ? result.otherTables.map((t) => t.id) : []
    expect(tables).toContain(tableA.id)
    expect(tables).not.toContain(tableB.id)
    expect(otherTables).toContain(tableB.id)
    expect(otherTables).not.toContain(tableA.id)
  })

  it('adds existing tables to the menu', async () => {
    // arrange: a test-a menu and a table on another menu
    const otherMenu = await payload.create({
      collection: 'menus',
      data: {
        title: uniqueName('Other Menu'),
        tenant: tenantA.id,
        _status: 'published',
      },
      draft: false,
      context,
    })
    const thisMenu = await payload.create({
      collection: 'menus',
      data: {
        title: uniqueName('This Menu'),
        tenant: tenantA.id,
        _status: 'published',
      },
      draft: false,
      context,
    })
    const table = await payload.create({
      collection: 'tables',
      data: {
        label: uniqueName('Table'),
        tenant: tenantA.id,
        menus: [otherMenu.id],
      },
      locale: 'en',
      context,
    })

    // act: addTablesToMenu(payload, member, { menuId, tableIds: [table] })
    const result = await addTablesToMenu(
      payload,
      member,
      {
        menuId: thisMenu.id,
        tableIds: [table.id],
      },
      { context },
    )

    // assert: ok; the table now lists both menus
    expect(result).toEqual({ ok: true })
    const updated = await payload.findByID({
      collection: 'tables',
      id: table.id,
      depth: 0,
      overrideAccess: true,
    })
    const menuIds = (updated.menus ?? []).map((m) => (typeof m === 'number' ? m : m.id))
    expect(menuIds).toContain(otherMenu.id)
    expect(menuIds).toContain(thisMenu.id)
  })

  it('refuses a viewer without update on tables', async () => {
    // arrange: a test-a menu and table
    const otherMenu = await payload.create({
      collection: 'menus',
      data: {
        title: uniqueName('Other Menu'),
        tenant: tenantA.id,
        _status: 'published',
      },
      draft: false,
      context,
    })
    const thisMenu = await payload.create({
      collection: 'menus',
      data: {
        title: uniqueName('This Menu'),
        tenant: tenantA.id,
        _status: 'published',
      },
      draft: false,
      context,
    })
    const table = await payload.create({
      collection: 'tables',
      data: {
        label: uniqueName('Table'),
        tenant: tenantA.id,
        menus: [otherMenu.id],
      },
      locale: 'en',
      context,
    })

    // act: addTablesToMenu as the viewer
    const result = await addTablesToMenu(
      payload,
      viewer,
      {
        menuId: thisMenu.id,
        tableIds: [table.id],
      },
      { context },
    )

    // assert: { ok: false }, the table is unchanged
    expect(result).toMatchObject({ ok: false })
    const check = await payload.findByID({
      collection: 'tables',
      id: table.id,
      depth: 0,
      overrideAccess: true,
    })
    const menuIds = (check.menus ?? []).map((m) => (typeof m === 'number' ? m : m.id))
    expect(menuIds).toEqual([otherMenu.id])
  })

  it("refuses another tenant's menu", async () => {
    // arrange: a test-b menu
    const menuB = await payload.create({
      collection: 'menus',
      data: {
        title: uniqueName('Menu B'),
        tenant: tenantB.id,
        _status: 'published',
      },
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
