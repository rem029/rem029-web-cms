import escapeHTML from 'escape-html'
import type { Payload, TypedUser } from 'payload'

import { qrPng, qrSvg } from '@/common/utils/qrCode'
import { extractTenantId } from '@/common/utils/tenantCollections'
import type { Tenant } from '@/payload-types'
import { getTenantURL } from '@/utilities/getURL'

export type QrFormat = 'png' | 'svg'

/** A QR code file for one table of a menu, or why it can't be made. */
export type MenuQrResult =
  | { ok: true; url: string; contentType: string; filename: string; body: Buffer | string }
  | { ok: false; status: 401 | 403 | 404; error: string }

/** The printable page of every table's QR code of a menu. */
export type MenuQrSheetResult =
  | { ok: true; html: string }
  | { ok: false; status: 401 | 403 | 404; error: string }

const isPopulatedTenant = (tenant: unknown): tenant is Tenant =>
  typeof tenant === 'object' &&
  tenant !== null &&
  'slug' in tenant &&
  typeof tenant.slug === 'string'

/**
 * The guest address a table's QR code opens (rem0018): the menu on its tenant's host with the
 * table picked, `<tenant url>/menu/<menu slug>?table=<table slug>`.
 */
export const tableOrderURL = (tenantURL: string, menuSlug: string, tableSlug: string): string => {
  return `${tenantURL}/menu/${encodeURIComponent(menuSlug)}?table=${encodeURIComponent(tableSlug)}`
}

type QrRefusal = { ok: false; status: 401 | 403 | 404; error: string }
type QrMenu = { ok: true; tenant: Tenant; slug: string; title: string }

/** The menu of a QR request, read as the user, with its business (for the address). */
const loadQrMenu = async (
  payload: Payload,
  user: TypedUser | null,
  menuId: number,
): Promise<QrMenu | QrRefusal> => {
  if (!user) return { ok: false, status: 401, error: 'Sign in to download QR codes.' }

  let menu
  try {
    menu = await payload.findByID({
      collection: 'menus',
      id: menuId,
      draft: true,
      depth: 1,
      user,
      overrideAccess: false,
      select: { slug: true, title: true, tenant: true },
    })
  } catch (err) {
    payload.logger.warn({ err, menuId, userId: user.id }, 'menu qr: menu not found')
    return { ok: false, status: 404, error: "This menu can't be found." }
  }

  if (!isPopulatedTenant(menu.tenant) || typeof menu.slug !== 'string' || !menu.slug.trim()) {
    return { ok: false, status: 404, error: 'Save the menu to get its QR codes.' }
  }
  return { ok: true, tenant: menu.tenant, slug: menu.slug, title: menu.title }
}

/**
 * One table's QR code (`/next/menu-qr`), for a signed-in user who can read the menu and the
 * table (Local API as the user). The table must list the menu and be of the same tenant.
 */
export const buildMenuQr = async (
  payload: Payload,
  user: TypedUser | null,
  args: { menuId: number; tableId: number; format: QrFormat },
): Promise<MenuQrResult> => {
  const menu = await loadQrMenu(payload, user, args.menuId)
  if (!menu.ok) return menu
  const { tenant, slug: menuSlug } = menu
  // loadQrMenu refused anonymous users
  const userId = user?.id

  let table
  try {
    table = await payload.findByID({
      collection: 'tables',
      id: args.tableId,
      depth: 0,
      user,
      overrideAccess: false,
    })
  } catch (err) {
    payload.logger.warn(
      { err, menuId: args.menuId, tableId: args.tableId, userId },
      'menu qr: table not found',
    )
    return { ok: false, status: 404, error: "This table can't be found." }
  }

  if (!table) {
    payload.logger.warn(
      { menuId: args.menuId, tableId: args.tableId, userId },
      'menu qr: table not found',
    )
    return { ok: false, status: 404, error: "This table can't be found." }
  }

  const tableTenantId = extractTenantId(table.tenant)
  const menuTenantId = tenant.id
  const tableMenuIds = (table.menus ?? [])
    .map(extractTenantId)
    .filter((id): id is number => id !== null)

  if (tableTenantId !== menuTenantId || !tableMenuIds.includes(args.menuId)) {
    payload.logger.warn(
      { menuId: args.menuId, tableId: args.tableId, userId },
      'menu qr: table not on menu',
    )
    return { ok: false, status: 403, error: "This table isn't on this menu." }
  }

  const tableSlug = table.slug ?? ''
  const url = tableOrderURL(getTenantURL(tenant), menuSlug, tableSlug)

  let contentType: string
  let body: Buffer | string
  if (args.format === 'png') {
    contentType = 'image/png'
    body = await qrPng(url)
  } else {
    contentType = 'image/svg+xml'
    body = await qrSvg(url)
  }

  const filename = `${menuSlug}-${tableSlug}.${args.format}`
  payload.logger.debug(
    { menuId: args.menuId, tableId: args.tableId, format: args.format, filename },
    'menu qr: generated',
  )
  return { ok: true, url, contentType, filename, body }
}

/**
 * Every table's QR code of a menu on one printable page (`/next/menu-qr/sheet`): a card per
 * table with the menu title, the table label and its code; prints one card per cell of a grid.
 */
export const buildMenuQrSheet = async (
  payload: Payload,
  user: TypedUser | null,
  args: { menuId: number },
): Promise<MenuQrSheetResult> => {
  const menu = await loadQrMenu(payload, user, args.menuId)
  if (!menu.ok) return menu
  const { tenant, slug: menuSlug, title: menuTitle } = menu
  const userId = user?.id

  let tablesDoc
  try {
    tablesDoc = await payload.find({
      collection: 'tables',
      where: {
        and: [
          { tenant: { equals: tenant.id } },
          { menus: { equals: args.menuId } },
          { isActive: { equals: true } },
        ],
      },
      sort: 'sortOrder',
      depth: 0,
      user,
      overrideAccess: false,
      limit: 200,
    })
  } catch (err) {
    payload.logger.warn({ err, menuId: args.menuId, userId }, 'menu qr sheet: tables error')
    return { ok: false, status: 403, error: "You can't see this menu's tables." }
  }

  const tables = tablesDoc.docs
  const escapedMenuTitle = escapeHTML(menuTitle)

  if (tables.length === 0) {
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>QR codes: ${escapedMenuTitle}</title><style>body { font-family: system-ui, -apple-system, sans-serif; padding: 2rem; text-align: center; }</style></head><body><h1>${escapedMenuTitle}</h1><p>This menu has no tables yet.</p></body></html>`
    return { ok: true, html }
  }

  const tenantURL = getTenantURL(tenant)
  const cards = await Promise.all(
    tables.map(async (table) => {
      const tableSlug = table.slug ?? ''
      const url = tableOrderURL(tenantURL, menuSlug, tableSlug)
      const svg = await qrSvg(url)
      const escapedTableLabel = escapeHTML(table.label)
      return `<div class="card"><h2>${escapedMenuTitle}</h2><p class="table-label">${escapedTableLabel}</p><div class="qr">${svg}</div></div>`
    }),
  )

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>QR codes: ${escapedMenuTitle}</title><style>body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 1cm; color: #000; } h1 { text-align: center; margin-bottom: 1cm; } .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(6cm, 1fr)); gap: 1cm; } .card { border: 1px solid #000; padding: 1cm; text-align: center; break-inside: avoid; } .card h2 { margin: 0 0 0.5rem; font-size: 1.25rem; } .card .table-label { margin: 0 0 1rem; font-size: 1.5rem; font-weight: bold; } .card .qr svg { width: 100%; height: auto; max-width: 5cm; display: block; margin: 0 auto; }</style></head><body><h1>${escapedMenuTitle}</h1><div class="grid">${cards.join('')}</div></body></html>`

  return { ok: true, html }
}
