import type { Payload, TypedUser } from 'payload'

import { extractTenantId } from '@/common/utils/tenantCollections'

import type { BuilderResult } from '../components/builderTypes'
import type { BuilderOptions } from './builder'

/** One table on a menu's Ordering tab. */
export type MenuTableRow = {
  id: number
  label: string
  slug: string
  isActive: boolean
}

/** What the Ordering tab's QR panel shows. */
export type MenuTables = {
  /** `null` until the menu is saved with a slug (no QR codes yet) */
  menuSlug: string | null
  /** the menu's tables, in their sort order */
  tables: MenuTableRow[]
  /** the tenant's other tables, for "Add existing tables" */
  otherTables: MenuTableRow[]
}

/**
 * The menu's tables and the tenant's other tables (rem0018 phase 1 step 1b), read as the user:
 * a user who can't read the menu or tables gets a refusal, never another tenant's rows.
 */
export const listMenuTables = async (
  payload: Payload,
  user: TypedUser,
  args: { menuId: number },
): Promise<BuilderResult<MenuTables>> => {
  let menu
  try {
    menu = await payload.findByID({
      collection: 'menus',
      id: args.menuId,
      draft: true,
      depth: 0,
      user,
      overrideAccess: false,
      select: { slug: true, tenant: true },
    })
  } catch (err) {
    payload.logger.warn(
      { err, menuId: args.menuId, userId: user.id },
      'list menu tables: menu not found',
    )
    return { ok: false, error: "This menu can't be found. Reload the page." }
  }

  if (!menu) {
    payload.logger.warn(
      { menuId: args.menuId, userId: user.id },
      'list menu tables: menu not found',
    )
    return { ok: false, error: "This menu can't be found. Reload the page." }
  }

  const tenantId = extractTenantId(menu.tenant)
  if (tenantId === null) {
    payload.logger.warn(
      { menuId: args.menuId, userId: user.id },
      'list menu tables: tenant missing',
    )
    return { ok: false, error: "This menu can't be found. Reload the page." }
  }

  let tablesResult
  try {
    tablesResult = await payload.find({
      collection: 'tables',
      where: {
        tenant: { equals: tenantId },
      },
      sort: 'sortOrder',
      limit: 200,
      depth: 0,
      user,
      overrideAccess: false,
      select: { label: true, slug: true, isActive: true, menus: true },
    })
  } catch (err) {
    payload.logger.warn(
      { err, menuId: args.menuId, tenantId, userId: user.id },
      "list menu tables: can't see tables",
    )
    return { ok: false, error: "You can't see this menu's tables." }
  }

  const tables: MenuTableRow[] = []
  const otherTables: MenuTableRow[] = []

  for (const doc of tablesResult.docs) {
    const row: MenuTableRow = {
      id: doc.id,
      label: doc.label,
      slug: doc.slug ?? '',
      isActive: doc.isActive ?? true,
    }
    const menuIds = (doc.menus ?? []).map(extractTenantId).filter((id): id is number => id !== null)

    if (menuIds.includes(args.menuId)) {
      tables.push(row)
    } else {
      otherTables.push(row)
    }
  }

  payload.logger.debug(
    { menuId: args.menuId, tenantId, tableCount: tables.length, otherCount: otherTables.length },
    'list menu tables',
  )
  return {
    ok: true,
    menuSlug: menu.slug ?? null,
    tables,
    otherTables,
  }
}

/**
 * "Add existing tables": adds the menu to each table's `menus`, as the user (their `tables`
 * update decides; the same-tenant hook refuses another tenant's table).
 */
export const addTablesToMenu = async (
  payload: Payload,
  user: TypedUser,
  args: { menuId: number; tableIds: number[] },
  options: BuilderOptions = {},
): Promise<BuilderResult> => {
  if (args.tableIds.length === 0) {
    return { ok: true }
  }
  if (args.tableIds.length > 200) {
    return { ok: false, error: 'Pick at most 200 tables at a time.' }
  }

  for (const tableId of args.tableIds) {
    let table
    try {
      table = await payload.findByID({
        collection: 'tables',
        id: tableId,
        depth: 0,
        user,
        overrideAccess: false,
      })
    } catch (err) {
      payload.logger.warn(
        { err, menuId: args.menuId, tableId, userId: user.id },
        'add tables to menu: table not found or read denied',
      )
      return { ok: false, error: 'Check that you can edit tables.' }
    }

    if (!table) {
      payload.logger.warn(
        { menuId: args.menuId, tableId, userId: user.id },
        'add tables to menu: table not found',
      )
      return { ok: false, error: 'Check that you can edit tables.' }
    }

    const currentMenuIds = (table.menus ?? [])
      .map(extractTenantId)
      .filter((id): id is number => id !== null)

    const updatedMenuIds = Array.from(new Set([...currentMenuIds, args.menuId]))

    try {
      await payload.update({
        collection: 'tables',
        id: tableId,
        data: {
          menus: updatedMenuIds,
        },
        user,
        overrideAccess: false,
        context: options.context,
      })
    } catch (err) {
      payload.logger.warn(
        { err, menuId: args.menuId, tableId, userId: user.id },
        'add tables to menu: update refused',
      )
      return {
        ok: false,
        error: `Couldn't add ${table.label}. Check that you can edit tables.`,
      }
    }
  }

  payload.logger.info(
    { menuId: args.menuId, tableIds: args.tableIds, userId: user.id },
    'add tables to menu: success',
  )
  return { ok: true }
}
