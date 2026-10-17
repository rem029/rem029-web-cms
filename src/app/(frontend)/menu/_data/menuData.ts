import type { Payload, TypedLocale } from 'payload'
import { unstable_cache } from 'next/cache'

import { menusTag } from '@/common/hooks/revalidateMenus'
import { frontendTenantWhere } from '@/common/utils/frontendTenant'
import { tenantCurrency } from '@/common/utils/tenantCurrency'
import type { Menu, MenuAllergen, MenuCategory, MenuItem, MenuTag } from '@/payload-types'

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
  /** the item view's photo (600px wide) */
  imageUrl: string | null
  /** the card's photo (300px wide: the card shows it at 96–112px) */
  thumbnailUrl: string | null
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

// search results shown at once; a guest refines the query rather than scrolling far
const SEARCH_LIMIT = 20
// a search box query, not a document: anything longer is cut
const MAX_QUERY_LENGTH = 100

const isDoc = <T extends { id: number }>(value: number | T | null | undefined): value is T =>
  typeof value === 'object' && value !== null

// a resized copy (small 600px, thumbnail 300px), else the original
const imageUrlOf = (image: MenuItem['image'], size: 'small' | 'thumbnail'): string | null => {
  if (!isDoc(image)) return null
  return image.sizes?.[size]?.url ?? image.url ?? null
}

const lookups = (values: (number | MenuAllergen | MenuTag)[] | null | undefined) =>
  (values ?? []).filter(isDoc).map(({ id, title }) => ({ id, title }))

const toGuestItem = (item: MenuItem): GuestMenuItem => ({
  id: item.id,
  slug: item.slug ?? String(item.id),
  title: item.title,
  description: item.description ?? null,
  price: item.price,
  imageUrl: imageUrlOf(item.image, 'small'),
  thumbnailUrl: imageUrlOf(item.image, 'thumbnail'),
  inStock: item.inStock !== false,
  allergens: lookups(item.allergens),
  tags: lookups(item.tags),
  availability: item.availability ?? [],
  modifierGroups: (item.modifierGroups ?? []).map((group) => ({
    name: group.name,
    inputType: group.inputType,
    required: group.required === true,
    options: group.options.map((option) => option.label),
  })),
})

const categoryIdOf = (item: MenuItem): number | null =>
  isDoc(item.category) ? item.category.id : (item.category ?? null)

/** The menu with this slug on this tenant: published, or the draft while previewing. */
export const findMenuPage = async (
  payload: Payload,
  tenantId: number | null,
  slug: string,
  { draft, locale }: FindOptions,
): Promise<Menu | null> => {
  if (tenantId === null) return null
  const { docs } = await payload.find({
    collection: 'menus',
    where: frontendTenantWhere(tenantId, { slug: { equals: slug } }),
    draft,
    // guests read published menus and active items only; a preview reads everything, like Pages
    overrideAccess: draft,
    locale,
    // the items, with their category, allergens, tags and image
    depth: 2,
    limit: 1,
    pagination: false,
  })
  const menu = docs[0] ?? null
  payload.logger.debug({ msg: 'menu page', tenantId, slug, draft, menuId: menu?.id })
  return menu
}

/** The host tenant's published menus for `/menu`, by title. */
export const listMenus = async (
  payload: Payload,
  tenantId: number | null,
  { locale }: { locale: TypedLocale },
): Promise<Menu[]> => {
  if (tenantId === null) return []
  const { docs } = await payload.find({
    collection: 'menus',
    where: frontendTenantWhere(tenantId),
    overrideAccess: false,
    locale,
    sort: 'title',
    // the header logo and carousel images for the cards, not the items' own relations
    depth: 1,
    pagination: false,
  })
  return docs
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
  const shown = (items ?? []).filter(isDoc).filter((item) => item.isActive !== false)
  const sorted = [...categories].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.title.localeCompare(b.title),
  )
  const known = new Set(sorted.map((category) => category.id))

  const sections: MenuSection[] = sorted
    .map((category) => ({
      category: {
        id: category.id,
        slug: category.slug ?? String(category.id),
        title: category.title,
      },
      items: shown.filter((item) => categoryIdOf(item) === category.id).map(toGuestItem),
    }))
    .filter((section) => section.items.length > 0)

  const other = shown.filter((item) => {
    const id = categoryIdOf(item)
    return id === null || !known.has(id)
  })
  if (other.length > 0) sections.push({ category: null, items: other.map(toGuestItem) })
  return sections
}

/** The menu items matching `query` (title or description) that are on this menu. */
export const searchMenuItems = async (
  payload: Payload,
  tenantId: number | null,
  menuId: number,
  query: string,
  locale: TypedLocale,
): Promise<GuestMenuItem[]> => {
  const text = query.trim().slice(0, MAX_QUERY_LENGTH)
  if (tenantId === null || text === '') return []

  // another tenant's menu id finds nothing here, so its items never come back
  const { docs: menus } = await payload.find({
    collection: 'menus',
    where: frontendTenantWhere(tenantId, { id: { equals: menuId } }),
    overrideAccess: false,
    depth: 0,
    limit: 1,
    pagination: false,
  })
  const ids = (menus[0]?.items ?? []).map((entry) => (isDoc(entry) ? entry.id : entry))
  if (ids.length === 0) return []

  const { docs } = await payload.find({
    collection: 'menu-items',
    where: frontendTenantWhere(tenantId, {
      and: [
        { id: { in: ids } },
        { or: [{ title: { like: text } }, { description: { like: text } }] },
      ],
    }),
    overrideAccess: false,
    locale,
    depth: 1,
    limit: SEARCH_LIMIT,
    pagination: false,
  })
  payload.logger.debug({ msg: 'menu search', tenantId, menuId, results: docs.length })
  // in the menu's order, as the page lists them
  return [...docs].sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id)).map(toGuestItem)
}

const loadMenuPage = async (
  payload: Payload,
  tenantId: number,
  slug: string,
  options: FindOptions,
): Promise<MenuPageData | null> => {
  const menu = await findMenuPage(payload, tenantId, slug, options)
  if (!menu) return null
  const { docs: categories } = await payload.find({
    collection: 'menu-categories',
    where: frontendTenantWhere(tenantId),
    overrideAccess: false,
    locale: options.locale,
    depth: 0,
    pagination: false,
  })
  return {
    menu,
    sections: buildMenuSections(menu.items, categories),
    currency: await tenantCurrency(payload, tenantId),
  }
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
  if (tenantId === null) return null
  if (options.draft) return loadMenuPage(payload, tenantId, slug, options)
  return unstable_cache(
    (id: number, menuSlug: string, locale: TypedLocale) =>
      loadMenuPage(payload, id, menuSlug, { draft: false, locale }),
    ['menu-page'],
    { tags: [menusTag(tenantId)] },
  )(tenantId, slug, options.locale)
}

/** `/menu` data, cached per tenant like getMenuPage. */
export const getMenuList = async (
  payload: Payload,
  tenantId: number | null,
  options: { locale: TypedLocale },
): Promise<Menu[]> => {
  if (tenantId === null) return []
  return unstable_cache(
    (id: number, locale: TypedLocale) => listMenus(payload, id, { locale }),
    ['menu-list'],
    { tags: [menusTag(tenantId)] },
  )(tenantId, options.locale)
}
