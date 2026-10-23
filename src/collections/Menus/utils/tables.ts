import type { Payload, TypedUser } from 'payload'

import { extractTenantId } from '@/common/utils/tenantCollections'

import type { BuilderResult } from '../components/builderTypes'

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
}

/**
 * The menu's own tables (rem0018 phase 1 steps 1b and 1c), read as the user: a user who can't read
 * the menu or tables gets a refusal, never another tenant's rows.
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
      where: { and: [{ tenant: { equals: tenantId } }, { menu: { equals: args.menuId } }] },
      sort: 'sortOrder',
      limit: 200,
      depth: 0,
      user,
      overrideAccess: false,
      select: { label: true, slug: true, isActive: true },
    })
  } catch (err) {
    payload.logger.warn(
      { err, menuId: args.menuId, tenantId, userId: user.id },
      "list menu tables: can't see tables",
    )
    return { ok: false, error: "You can't see this menu's tables." }
  }

  const tables: MenuTableRow[] = tablesResult.docs.map((doc) => ({
    id: doc.id,
    label: doc.label,
    slug: doc.slug ?? '',
    isActive: doc.isActive ?? true,
  }))

  payload.logger.debug(
    { menuId: args.menuId, tenantId, tableCount: tables.length },
    'list menu tables',
  )
  return { ok: true, menuSlug: menu.slug ?? null, tables }
}
