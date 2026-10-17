import type { Payload, TypedLocale } from 'payload'
import { unstable_cache } from 'next/cache'

import type { Menu, MenuCategory, MenuItem } from '@/payload-types'

/**
 * The guest menu pages' data (rem0017 phase 3): `/menu` lists the host tenant's published menus,
 * `/menu/<slug>` shows one, its items grouped by category. Every read takes the host's tenant id
 * (`getFrontendTenantId()`) and fails closed without one; reads run as an anonymous guest
 * (`overrideAccess: false`), so only published menus and active items come back, except while
 * previewing (drafts, like Pages). Cached per tenant with the tag `menus_<tenantId>`
 * (`menusTag`, revalidated by `revalidateMenus`).
 */

type FindOptions = { draft: boolean; locale: TypedLocale }

/** An item as guests see it: only what the menu page shows, plain and serialisable. */
export type GuestMenuItem = {
  id: number
  slug: string
  title: string
  description: string | null
  price: number
  imageUrl: string | null
  inStock: boolean
  allergens: { id: number; title: string }[]
  tags: { id: number; title: string }[]
  availability: NonNullable<MenuItem['availability']>
  modifierGroups: {
    name: string
    inputType: 'checkbox' | 'radio'
    required: boolean
    options: string[]
  }[]
}

/** One category of the menu page; `category: null` is "Other" (items without a category). */
export type MenuSection = {
  category: { id: number; slug: string; title: string } | null
  items: GuestMenuItem[]
}

/** Everything `/menu/<slug>` renders. */
export type MenuPageData = {
  menu: Menu
  sections: MenuSection[]
  currency: string
}

/** The menu with this slug on this tenant: published, or the draft while previewing. */
export const findMenuPage = async (
  payload: Payload,
  tenantId: number | null,
  slug: string,
  options: FindOptions,
): Promise<Menu | null> => {
  // 1. no tenant (unknown or inactive host) → null, no query
  // 2. payload.find menus: frontendTenantWhere(tenantId, { slug }), draft: options.draft,
  //    overrideAccess: options.draft (guests: published only), locale, depth 2 (items with their
  //    category, allergens, tags, image), limit 1
  // 3. debug log { msg: 'menu page', tenantId, slug, draft, menuId }
  // 4. return the doc or null
  void payload
  void tenantId
  void slug
  void options
  throw new Error('not implemented')
}

/** The host tenant's published menus for `/menu`, by title. */
export const listMenus = async (
  payload: Payload,
  tenantId: number | null,
  options: { locale: TypedLocale },
): Promise<Menu[]> => {
  // 1. no tenant → []
  // 2. payload.find menus: frontendTenantWhere(tenantId), overrideAccess false (published only),
  //    sort 'title', depth 1 (header logo for the card), limit 0, pagination false, locale
  // 3. return the docs
  void payload
  void tenantId
  void options
  throw new Error('not implemented')
}

/**
 * The menu's items in sections: categories by `sortOrder`, the menu's own order inside a
 * category, uncategorized items last ("Other"). Inactive items are left out (a draft preview
 * reads them too), out of stock ones stay (the card marks them). Categories without items get
 * no section. Pure.
 */
export const buildMenuSections = (
  items: Menu['items'],
  categories: MenuCategory[],
): MenuSection[] => {
  // 1. keep populated items (objects, not ids) with isActive !== false; map each to GuestMenuItem
  //    (toGuestItem below: image url, populated allergens/tags titles, option labels)
  // 2. for each category in categories sorted by sortOrder (then title): its items in menu order;
  //    skip it when empty
  // 3. the items whose category is empty or not in `categories` → a last section with
  //    category null
  void items
  void categories
  throw new Error('not implemented')
}

/** The menu items matching `query` (title or description) that are on this menu. */
export const searchMenuItems = async (
  payload: Payload,
  tenantId: number | null,
  menuId: number,
  query: string,
  locale: TypedLocale,
): Promise<GuestMenuItem[]> => {
  // 1. no tenant, or a blank query → []
  // 2. the menu's item ids: payload.find menus where frontendTenantWhere(tenantId, { id: menuId }),
  //    overrideAccess false, depth 0 → its items (another tenant's menu id → nothing → [])
  // 3. payload.find menu-items: frontendTenantWhere(tenantId, { id in ids, or: [title like
  //    query, description like query] }), overrideAccess false (active only), locale, depth 1,
  //    limit 20
  // 4. map with toGuestItem, in the menu's order
  void payload
  void tenantId
  void menuId
  void query
  void locale
  throw new Error('not implemented')
}

/**
 * `/menu/<slug>` data, cached per tenant (published only: a preview reads fresh every time).
 * The tenant id is an argument of the cached callback, so it's in the cache key.
 */
export const getMenuPage = async (
  payload: Payload,
  tenantId: number | null,
  slug: string,
  options: FindOptions,
): Promise<MenuPageData | null> => {
  // 1. no tenant → null
  // 2. load = async (tenantId, slug, locale, draft) →
  //    findMenuPage → null when missing; the tenant's categories (menu-categories,
  //    frontendTenantWhere, sort sortOrder, locale, limit 0); currency via tenantCurrency;
  //    → { menu, sections: buildMenuSections(menu.items, categories), currency }
  // 3. draft → load directly; else unstable_cache(load, ['menu-page'], { tags: [menusTag(tenantId)] })
  //    (tenantId, slug, locale, false)
  void payload
  void tenantId
  void slug
  void options
  void unstable_cache
  throw new Error('not implemented')
}

/** `/menu` data, cached per tenant like getMenuPage. */
export const getMenuList = async (
  payload: Payload,
  tenantId: number | null,
  options: { locale: TypedLocale },
): Promise<Menu[]> => {
  // 1. no tenant → []
  // 2. unstable_cache((tenantId, locale) => listMenus(...), ['menu-list'],
  //    { tags: [menusTag(tenantId)] })(tenantId, options.locale)
  void payload
  void tenantId
  void options
  throw new Error('not implemented')
}
