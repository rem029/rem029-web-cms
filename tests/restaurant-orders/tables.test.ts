// Tables (rem0018 phase 1 step 1b, src/collections/Tables): tenant-scoped, slug unique per tenant,
// linked to menus of their own tenant, listed on each menu (join). As the editor of test-a with
// overrideAccess: false; each test creates its own tables and menus with unique names.
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import type { Tenant } from '@/payload-types'

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

  beforeAll(async () => {
    payload = await getTestPayload()
    tenantA = await findTenant(payload, TEST_TENANTS.a)
    tenantB = await findTenant(payload, TEST_TENANTS.b)
    member = await loadUser(payload, TEST_USERS.member)
    otherTenant = await loadUser(payload, TEST_USERS.otherTenant)
  })

  it('refuses a duplicate table slug in one tenant', async () => {
    // arrange: a table "Table X" in test-a
    const label = uniqueName('Table X')
    const table = await payload.create({
      collection: 'tables',
      data: { label, tenant: tenantA.id },
      locale: 'en',
      user: member,
      overrideAccess: false,
      context,
    })

    // act: create another "Table X" in test-a as the member
    const call = payload.create({
      collection: 'tables',
      data: { label, tenant: tenantA.id },
      locale: 'en',
      user: member,
      overrideAccess: false,
      context,
    })

    // assert: rejects; the message names the slug and "already exists in this business"
    const text = await rejectionText(call)
    expect(text).toContain(table.slug)
    expect(text).toContain('already exists in this business')
  })

  it('allows the same slug in another tenant', async () => {
    // arrange: a table "Table X" in test-a
    const label = uniqueName('Table X')
    const tableA = await payload.create({
      collection: 'tables',
      data: { label, tenant: tenantA.id },
      locale: 'en',
      user: member,
      overrideAccess: false,
      context,
    })

    // act: create "Table X" in test-b as otherTenant
    const tableB = await payload.create({
      collection: 'tables',
      data: { label, tenant: tenantB.id },
      locale: 'en',
      user: otherTenant,
      overrideAccess: false,
      context,
    })

    // assert: created
    expect(tableB.id).toBeDefined()
    expect(tableB.slug).toBe(tableA.slug)
  })

  it('hides tables of other tenants', async () => {
    // arrange: a table in test-b
    const tableB = await payload.create({
      collection: 'tables',
      data: { label: uniqueName('Table B'), tenant: tenantB.id },
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
    const menuB = await payload.create({
      collection: 'menus',
      data: {
        title: uniqueName('Menu B'),
        tenant: tenantB.id,
        _status: 'published',
      },
      draft: false,
      user: otherTenant,
      overrideAccess: false,
      context,
    })

    // act: create a test-a table with menus [that menu] as the member
    const call = payload.create({
      collection: 'tables',
      data: {
        label: uniqueName('Table A'),
        tenant: tenantA.id,
        menus: [menuB.id],
      },
      locale: 'en',
      user: member,
      overrideAccess: false,
      context,
    })

    // assert: rejects with "belongs to another business"
    const text = await rejectionText(call)
    expect(text).toContain('belongs to another business')
  })

  it('lists the table on each of its menus', async () => {
    // arrange: two test-a menus, one table with menus [both]
    const menu1 = await payload.create({
      collection: 'menus',
      data: {
        title: uniqueName('Menu 1'),
        tenant: tenantA.id,
        _status: 'published',
        ordering: { enabled: true },
      },
      draft: false,
      user: member,
      overrideAccess: false,
      context,
    })
    const menu2 = await payload.create({
      collection: 'menus',
      data: {
        title: uniqueName('Menu 2'),
        tenant: tenantA.id,
        _status: 'published',
        ordering: { enabled: true },
      },
      draft: false,
      user: member,
      overrideAccess: false,
      context,
    })
    const table = await payload.create({
      collection: 'tables',
      data: {
        label: uniqueName('Table Both'),
        tenant: tenantA.id,
        menus: [menu1.id, menu2.id],
      },
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

    // assert: each menu.ordering.tables.docs contains the table
    const docs1 = read1.ordering?.tables?.docs?.map((t) => (typeof t === 'number' ? t : t.id))
    const docs2 = read2.ordering?.tables?.docs?.map((t) => (typeof t === 'number' ? t : t.id))
    expect(docs1).toContain(table.id)
    expect(docs2).toContain(table.id)
  })

  it('defaults to taking orders', async () => {
    // arrange: —
    // act: create a table without isActive
    const table = await payload.create({
      collection: 'tables',
      data: {
        label: uniqueName('Table Default'),
        tenant: tenantA.id,
      },
      locale: 'en',
      user: member,
      overrideAccess: false,
      context,
    })

    // assert: isActive is true
    expect(table.isActive).toBe(true)
  })
})
