// The table of a QR code (rem0018 phase 1 step 1b, resolveOrderTable in
// src/common/utils/orderTables.ts): only an active table of the host's tenant that lists the menu.
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { resolveOrderTable } from '@/common/utils/orderTables'
import type { Tenant } from '@/payload-types'

import { getTestPayload } from '../common/payload'
import { TEST_TENANTS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'

const context = { disableRevalidate: true }

describe('resolveOrderTable', () => {
  let payload: Payload
  let tenantA: Tenant
  let tenantB: Tenant

  beforeAll(async () => {
    payload = await getTestPayload()
    tenantA = await findTenant(payload, TEST_TENANTS.a)
    tenantB = await findTenant(payload, TEST_TENANTS.b)
  })

  it('resolves a table of the menu', async () => {
    // arrange: a test-a menu and an active table listing it
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
    const label = uniqueName('Table')
    const table = await payload.create({
      collection: 'tables',
      data: {
        label,
        tenant: tenantA.id,
        menus: [menu.id],
        isActive: true,
      },
      locale: 'en',
      context,
    })

    // act: resolveOrderTable(payload, { tenantId: a, menuId, tableSlug })
    const result = await resolveOrderTable(payload, {
      tenantId: tenantA.id,
      menuId: menu.id,
      tableSlug: table.slug ?? '',
    })

    // assert: { id, slug, label } of the table
    expect(result).toEqual({
      id: table.id,
      slug: table.slug,
      label: table.label,
    })
  })

  it('rejects a table not linked to the menu', async () => {
    // arrange: a test-a table listing another menu
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
        isActive: true,
      },
      locale: 'en',
      context,
    })

    // act: resolveOrderTable for this menu
    const result = await resolveOrderTable(payload, {
      tenantId: tenantA.id,
      menuId: thisMenu.id,
      tableSlug: table.slug ?? '',
    })

    // assert: null
    expect(result).toBeNull()
  })

  it('rejects an inactive table', async () => {
    // arrange: a test-a table of the menu with isActive false
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
    const table = await payload.create({
      collection: 'tables',
      data: {
        label: uniqueName('Table Inactive'),
        tenant: tenantA.id,
        menus: [menu.id],
        isActive: false,
      },
      locale: 'en',
      context,
    })

    // act: resolveOrderTable
    const result = await resolveOrderTable(payload, {
      tenantId: tenantA.id,
      menuId: menu.id,
      tableSlug: table.slug ?? '',
    })

    // assert: null
    expect(result).toBeNull()
  })

  it("rejects another tenant's table", async () => {
    // arrange: a test-b table with the same slug as asked, on a test-b menu
    const menuB = await payload.create({
      collection: 'menus',
      data: {
        title: uniqueName('Menu B'),
        tenant: tenantB.id,
        _status: 'published',
      },
      draft: false,
      context,
    })
    const menuA = await payload.create({
      collection: 'menus',
      data: {
        title: uniqueName('Menu A'),
        tenant: tenantA.id,
        _status: 'published',
      },
      draft: false,
      context,
    })
    const tableB = await payload.create({
      collection: 'tables',
      data: {
        label: uniqueName('Table B'),
        tenant: tenantB.id,
        menus: [menuB.id],
        isActive: true,
      },
      locale: 'en',
      context,
    })

    // act: resolveOrderTable with tenantId of test-a and the test-a menu
    const result = await resolveOrderTable(payload, {
      tenantId: tenantA.id,
      menuId: menuA.id,
      tableSlug: tableB.slug ?? '',
    })

    // assert: null
    expect(result).toBeNull()
  })

  it('rejects an empty or over-long slug', async () => {
    // arrange: —
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

    // act: resolveOrderTable with '' and with 200 x's
    const emptyResult = await resolveOrderTable(payload, {
      tenantId: tenantA.id,
      menuId: menu.id,
      tableSlug: '',
    })
    const longResult = await resolveOrderTable(payload, {
      tenantId: tenantA.id,
      menuId: menu.id,
      tableSlug: 'x'.repeat(200),
    })

    // assert: null both times
    expect(emptyResult).toBeNull()
    expect(longResult).toBeNull()
  })
})
