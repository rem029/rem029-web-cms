// QR codes of a menu's tables (rem0018 phase 1 step 1b, src/collections/Menus/utils/menuQr.ts,
// behind /next/menu-qr and /next/menu-qr/sheet): for signed-in users who can read the menu, only
// for tables on that menu, pointing at the menu on its tenant host with the table picked.
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { buildMenuQr, buildMenuQrSheet, tableOrderURL } from '@/collections/Menus/utils/menuQr'
import type { Tenant } from '@/payload-types'
import { getTenantURL } from '@/utilities/getURL'

import { getTestPayload } from '../common/payload'
import { TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'
import { loadUser, type SessionUser } from '../common/users'

const context = { disableRevalidate: true }

describe('menu QR codes', () => {
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

  it('builds the guest url with the table', () => {
    // arrange: —
    // act: tableOrderURL('https://a.example', 'corniche', 'table-5')
    const url = tableOrderURL('https://a.example', 'corniche', 'table-5')

    // assert: 'https://a.example/menu/corniche?table=table-5'
    expect(url).toBe('https://a.example/menu/corniche?table=table-5')
  })

  it('returns a png pointing at the menu with the table', async () => {
    // arrange: a published test-a menu and a table on it
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
        label: uniqueName('Table'),
        tenant: tenantA.id,
        menus: [menu.id],
      },
      locale: 'en',
      context,
    })

    // act: buildMenuQr(payload, member, { menuId, tableId, format: 'png' })
    const result = await buildMenuQr(payload, member, {
      menuId: menu.id,
      tableId: table.id,
      format: 'png',
    })

    // assert: ok, url = tableOrderURL(getTenantURL(test-a), menu slug, table slug), contentType image/png, body starts with the png signature, filename <menu>-<table>.png
    const expectedUrl = `${getTenantURL(tenantA)}/menu/${menu.slug}?table=${table.slug}`
    expect(result).toMatchObject({
      ok: true,
      url: expectedUrl,
      contentType: 'image/png',
      filename: `${menu.slug}-${table.slug}.png`,
    })
    const body = result.ok && Buffer.isBuffer(result.body) ? result.body : Buffer.alloc(0)
    expect(body.subarray(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]))
  })

  it('returns an svg for print', async () => {
    // arrange: the same menu and table
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
        label: uniqueName('Table'),
        tenant: tenantA.id,
        menus: [menu.id],
      },
      locale: 'en',
      context,
    })

    // act: format 'svg'
    const result = await buildMenuQr(payload, member, {
      menuId: menu.id,
      tableId: table.id,
      format: 'svg',
    })

    // assert: ok, contentType image/svg+xml, body contains "<svg"
    expect(result).toMatchObject({
      ok: true,
      contentType: 'image/svg+xml',
    })
    const body = result.ok && typeof result.body === 'string' ? result.body : ''
    expect(body).toContain('<svg')
  })

  it('refuses anonymous requests', async () => {
    // arrange: —
    // act: buildMenuQr with user null
    const result = await buildMenuQr(payload, null, {
      menuId: 1,
      tableId: 1,
      format: 'png',
    })

    // assert: { ok: false, status: 401 }
    expect(result).toMatchObject({
      ok: false,
      status: 401,
    })
  })

  it('refuses a table outside the menu', async () => {
    // arrange: a test-a table not on the menu
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
        label: uniqueName('Table'),
        tenant: tenantA.id,
      },
      locale: 'en',
      context,
    })

    // act: buildMenuQr as the member
    const result = await buildMenuQr(payload, member, {
      menuId: menu.id,
      tableId: table.id,
      format: 'png',
    })

    // assert: { ok: false, status: 403 }
    expect(result).toMatchObject({
      ok: false,
      status: 403,
    })
  })

  it('refuses a menu of another tenant', async () => {
    // arrange: a test-b menu and table
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
    const tableB = await payload.create({
      collection: 'tables',
      data: {
        label: uniqueName('Table B'),
        tenant: tenantB.id,
        menus: [menuB.id],
      },
      locale: 'en',
      overrideAccess: true,
      context,
    })

    // act: buildMenuQr as the member of test-a
    const result = await buildMenuQr(payload, member, {
      menuId: menuB.id,
      tableId: tableB.id,
      format: 'png',
    })

    // assert: { ok: false, status: 404 }
    expect(result).toMatchObject({
      ok: false,
      status: 404,
    })
  })

  it('prints a card per table on the sheet', async () => {
    // arrange: a menu with two tables
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
    const label1 = uniqueName('Table 1')
    const label2 = uniqueName('Table 2')
    await payload.create({
      collection: 'tables',
      data: {
        label: label1,
        tenant: tenantA.id,
        menus: [menu.id],
      },
      locale: 'en',
      context,
    })
    await payload.create({
      collection: 'tables',
      data: {
        label: label2,
        tenant: tenantA.id,
        menus: [menu.id],
      },
      locale: 'en',
      context,
    })

    // act: buildMenuQrSheet as the member
    const result = await buildMenuQrSheet(payload, member, { menuId: menu.id })

    // assert: ok; html contains both labels and two <svg
    expect(result).toMatchObject({ ok: true })
    const html = result.ok ? result.html : ''
    expect(html).toContain(label1)
    expect(html).toContain(label2)
    expect(html.split('<svg').length - 1).toBe(2)
  })

  it('escapes table labels on the sheet', async () => {
    // arrange: a table labelled "<b>Patio</b>"
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
    await payload.create({
      collection: 'tables',
      data: {
        label: '<b>Patio</b>',
        tenant: tenantA.id,
        menus: [menu.id],
      },
      locale: 'en',
      context,
    })

    // act: buildMenuQrSheet
    const result = await buildMenuQrSheet(payload, member, { menuId: menu.id })

    // assert: html contains "&lt;b&gt;Patio" and no "<b>Patio"
    expect(result).toMatchObject({ ok: true })
    const html = result.ok ? result.html : ''
    expect(html).toContain('&lt;b&gt;Patio')
    expect(html).not.toContain('<b>Patio')
  })
})
