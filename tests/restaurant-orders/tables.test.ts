// Tables (rem0018 phase 1 steps 1b and 1c, src/collections/Tables): tenant-scoped, each on one
// menu of its own tenant, slug unique per menu, listed on its menu (join). As the editor of test-a
// with overrideAccess: false; each test creates its own tables and menus with unique names.
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import type { Menu, Tenant } from '@/payload-types'
import { extractTenantId } from '@/common/utils/tenantCollections'

import { rejectionText } from '../common/errors'
import { getTestPayload } from '../common/payload'
import { TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'
import { loadUser, type SessionUser } from '../common/users'

const context = { disableRevalidate: true }

describe('tables', () => {
  let payload: Payload
  let tenantA: Tenant
  let tenantB: Tenant
  let member: SessionUser
  let otherTenant: SessionUser
  let superUser: SessionUser

  const createMenu = (tenant: Tenant, user: SessionUser): Promise<Menu> =>
    payload.create({
      collection: 'menus',
      data: { title: uniqueName('Menu'), tenant: tenant.id, _status: 'published' },
      draft: false,
      user,
      overrideAccess: false,
      context,
    })

  beforeAll(async () => {
    payload = await getTestPayload()
    tenantA = await findTenant(payload, TEST_TENANTS.a)
    tenantB = await findTenant(payload, TEST_TENANTS.b)
    member = await loadUser(payload, TEST_USERS.member)
    otherTenant = await loadUser(payload, TEST_USERS.otherTenant)
    superUser = await loadUser(payload, TEST_USERS.superUser)
  })

  it('refuses a duplicate table slug on one menu', async () => {
    // arrange: a test-a menu with a table "Table X"
    const menu = await createMenu(tenantA, member)
    const label = uniqueName('Table X')
    const table = await payload.create({
      collection: 'tables',
      data: { label, tenant: tenantA.id, menu: menu.id },
      locale: 'en',
      user: member,
      overrideAccess: false,
      context,
    })

    // act: create another "Table X" on that menu as the member
    const call = payload.create({
      collection: 'tables',
      data: { label, tenant: tenantA.id, menu: menu.id },
      locale: 'en',
      user: member,
      overrideAccess: false,
      context,
    })

    // assert: rejects; the message names the slug and "already exists on this menu"
    const text = await rejectionText(call)
    expect(text).toContain(table.slug)
    expect(text).toContain('already exists on this menu')
  })

  it('allows the same slug on another menu', async () => {
    // arrange: two test-a menus, "Table X" on the first
    const menu1 = await createMenu(tenantA, member)
    const menu2 = await createMenu(tenantA, member)
    const label = uniqueName('Table X')
    const table1 = await payload.create({
      collection: 'tables',
      data: { label, tenant: tenantA.id, menu: menu1.id, seats: 3 },
      locale: 'en',
      user: member,
      overrideAccess: false,
      context,
    })

    // act: create "Table X" on the second menu with other seats
    const table2 = await payload.create({
      collection: 'tables',
      data: { label, tenant: tenantA.id, menu: menu2.id, seats: 4 },
      locale: 'en',
      user: member,
      overrideAccess: false,
      context,
    })

    // assert: created with the same slug and its own seats
    expect(table2.slug).toBe(table1.slug)
    expect(table2.seats).toBe(4)
  })

  it('allows the same slug in another tenant', async () => {
    // arrange: a test-a menu with "Table X", a test-b menu
    const menuA = await createMenu(tenantA, member)
    const menuB = await createMenu(tenantB, otherTenant)
    const label = uniqueName('Table X')
    const tableA = await payload.create({
      collection: 'tables',
      data: { label, tenant: tenantA.id, menu: menuA.id },
      locale: 'en',
      user: member,
      overrideAccess: false,
      context,
    })

    // act: create "Table X" on the test-b menu as otherTenant
    const tableB = await payload.create({
      collection: 'tables',
      data: { label, tenant: tenantB.id, menu: menuB.id },
      locale: 'en',
      user: otherTenant,
      overrideAccess: false,
      context,
    })

    // assert: created
    expect(tableB.id).toBeDefined()
    expect(tableB.slug).toBe(tableA.slug)
  })

  it('requires a menu', async () => {
    // arrange: —
    // act: create a test-a table without a menu
    const call = payload.create({
      collection: 'tables',
      // @ts-expect-error menu is required: the test sends a table without one
      data: { label: uniqueName('Table'), tenant: tenantA.id },
      locale: 'en',
      user: member,
      overrideAccess: false,
      context,
    })

    // assert: rejects, naming the Menu field
    const text = await rejectionText(call)
    expect(text).toContain('Menu')
  })

  it('hides tables of other tenants', async () => {
    // arrange: a table in test-b
    const menuB = await createMenu(tenantB, otherTenant)
    const tableB = await payload.create({
      collection: 'tables',
      data: { label: uniqueName('Table B'), tenant: tenantB.id, menu: menuB.id },
      locale: 'en',
      user: otherTenant,
      overrideAccess: false,
      context,
    })

    // act: find tables as the member of test-a
    const { docs } = await payload.find({
      collection: 'tables',
      user: member,
      overrideAccess: false,
    })

    // assert: the test-b table is not in the result
    expect(docs.map((doc) => doc.id)).not.toContain(tableB.id)
  })

  it("refuses another tenant's menu on a table", async () => {
    // arrange: a published menu in test-b
    const menuB = await createMenu(tenantB, otherTenant)

    // act: create a test-a table on that menu as the member
    const call = payload.create({
      collection: 'tables',
      data: { label: uniqueName('Table A'), tenant: tenantA.id, menu: menuB.id },
      locale: 'en',
      user: member,
      overrideAccess: false,
      context,
    })

    // assert: rejects with "belongs to another business"
    const text = await rejectionText(call)
    expect(text).toContain('belongs to another business')
  })

  it('takes the business from its menu', async () => {
    // arrange: a test-b menu; the super user's selected business is test-a
    const menuB = await createMenu(tenantB, otherTenant)

    // act: create a table with test-a and that menu as the super user
    const table = await payload.create({
      collection: 'tables',
      data: { label: uniqueName('Table'), tenant: tenantA.id, menu: menuB.id },
      locale: 'en',
      user: superUser,
      overrideAccess: false,
      context,
    })

    // assert: the table is in test-b
    expect(extractTenantId(table.tenant)).toBe(tenantB.id)
  })

  it('lists the table on its menu', async () => {
    // arrange: two test-a menus with ordering on, a table on the first
    const menu1 = await createMenu(tenantA, member)
    const menu2 = await createMenu(tenantA, member)
    const table = await payload.create({
      collection: 'tables',
      data: { label: uniqueName('Table'), tenant: tenantA.id, menu: menu1.id },
      locale: 'en',
      user: member,
      overrideAccess: false,
      context,
    })

    // act: findByID each menu (draft: true) with joins
    const read1 = await payload.findByID({
      collection: 'menus',
      id: menu1.id,
      draft: true,
      depth: 1,
      user: member,
      overrideAccess: false,
    })
    const read2 = await payload.findByID({
      collection: 'menus',
      id: menu2.id,
      draft: true,
      depth: 1,
      user: member,
      overrideAccess: false,
    })

    // assert: only the first menu's ordering.tables.docs contains the table
    const docs1 = read1.ordering?.tables?.docs?.map((t) => (typeof t === 'number' ? t : t.id))
    const docs2 = read2.ordering?.tables?.docs?.map((t) => (typeof t === 'number' ? t : t.id))
    expect(docs1).toContain(table.id)
    expect(docs2 ?? []).not.toContain(table.id)
  })

  it('deletes its tables with the menu', async () => {
    // arrange: a test-a menu with a table
    const menu = await createMenu(tenantA, member)
    const table = await payload.create({
      collection: 'tables',
      data: { label: uniqueName('Table'), tenant: tenantA.id, menu: menu.id },
      locale: 'en',
      user: member,
      overrideAccess: false,
      context,
    })

    // act: delete the menu as the member
    await payload.delete({
      collection: 'menus',
      id: menu.id,
      user: member,
      overrideAccess: false,
      context,
    })

    // assert: the table is gone
    const { totalDocs } = await payload.count({
      collection: 'tables',
      where: { id: { equals: table.id } },
    })
    expect(totalDocs).toBe(0)
  })

  it('defaults to taking orders', async () => {
    // arrange: a test-a menu
    const menu = await createMenu(tenantA, member)

    // act: create a table without isActive
    const table = await payload.create({
      collection: 'tables',
      data: { label: uniqueName('Table Default'), tenant: tenantA.id, menu: menu.id },
      locale: 'en',
      user: member,
      overrideAccess: false,
      context,
    })

    // assert: isActive is true
    expect(table.isActive).toBe(true)
  })
})
