/**
 * The menu builder's server functions (rem0017 phase 2 step 2): what the Items tab of a menu
 * lists and saves. Called by the server actions in `../components/actions.ts` and by the tests.
 *
 * Each takes `(payload, user, args)` and runs the Local API with `overrideAccess: false` for that
 * user, so the profile's access (and disabled users, inactive tenants) applies as anywhere else.
 * The tenant is the menu's (`args.tenantId`, from the menu form, so the builder works before the
 * first save); every read and write is limited to it. Refusals come back as `{ ok: false, error }`
 * in plain words and are logged (`warn`), failures `error`, writes `info`.
 */
import type { Payload, TypedUser } from 'payload'

import type {
  BuilderCategory,
  BuilderItem,
  BuilderLookup,
  BuilderResult,
  BuilderScope,
  CategoryFormData,
  ItemFormData,
  QuickItemUpdate,
} from '../components/builderTypes'

/** Items panel: the tenant's items (active or not), filtered by category and title. */
export const listBuilderItems = async (
  _payload: Payload,
  _user: TypedUser,
  _args: BuilderScope & { categoryId?: number | null; search?: string },
): Promise<BuilderResult<{ items: BuilderItem[]; currency: string }>> => {
  // 1. find menu-items where tenant = tenantId (+ category = categoryId, + title like search),
  //    sort title, depth 1 (category title, image url), pagination false, locale, user,
  //    overrideAccess false
  // 2. map each doc to a BuilderItem (category/image may be an id or a populated doc: narrow)
  // 3. currency: the tenant's settings.currency, else DEFAULT_CURRENCY
  // 4. a refusal (Forbidden) → refuse('You can't open this business's items.'), logged warn
  throw new Error('not implemented')
}

/** "Add all to this menu": every active item of one category, in title order. */
export const listItemsOfCategory = async (
  _payload: Payload,
  _user: TypedUser,
  _args: BuilderScope & { categoryId: number },
): Promise<BuilderResult<{ itemIds: number[] }>> => {
  // 1. find menu-items where tenant = tenantId, category = categoryId, isActive = true,
  //    depth 0, pagination false, user, overrideAccess false
  // 2. return their ids
  throw new Error('not implemented')
}

/** Inline edits from the items panel (price, stock, shown, category); saves the item now. */
export const quickUpdateItem = async (
  _payload: Payload,
  _user: TypedUser,
  _args: BuilderScope & { itemId: number; data: QuickItemUpdate },
): Promise<BuilderResult<{ item: BuilderItem }>> => {
  // 1. assertItemInTenant: findByID-like find (id + tenant) with the user; none → refuse
  //    'You can only edit items of this business.' (another tenant's item, or no read)
  // 2. update menu-items id with only the given keys, user, overrideAccess false, locale
  // 3. Forbidden → refuse('You don't have permission to edit items. Ask your admin.')
  // 4. logger.info({ itemId, tenantId, userId }, 'menu builder: item updated')
  throw new Error('not implemented')
}

/** The item form (`ItemFormModal`) for an existing item, in the admin locale. */
export const getItemForm = async (
  _payload: Payload,
  _user: TypedUser,
  _args: BuilderScope & { itemId: number },
): Promise<BuilderResult<{ data: ItemFormData }>> => {
  // 1. find the item by id + tenant with the user, depth 0, locale
  // 2. none → refuse('This item is no longer available.')
  // 3. map the doc to ItemFormData (relationship ids, modifier groups without row ids)
  throw new Error('not implemented')
}

/** Creates (no `itemId`) or updates an item from the full form, in the menu's tenant. */
export const saveItem = async (
  _payload: Payload,
  _user: TypedUser,
  _args: BuilderScope & { itemId?: number; data: ItemFormData },
): Promise<BuilderResult<{ item: BuilderItem }>> => {
  // 1. itemId → assertItemInTenant, then update; else create with tenant = tenantId
  // 2. user, overrideAccess false, locale, depth 1 → BuilderItem
  // 3. ValidationError → refuse with its first message (e.g. the same-tenant check, a price < 0)
  // 4. logger.info created / updated
  throw new Error('not implemented')
}

/** Categories panel: the tenant's categories in sort order, with how many items each has. */
export const listBuilderCategories = async (
  _payload: Payload,
  _user: TypedUser,
  _args: BuilderScope,
): Promise<BuilderResult<{ categories: BuilderCategory[] }>> => {
  // 1. find menu-categories where tenant = tenantId, sort sortOrder, pagination false
  // 2. one count of menu-items per category (where tenant + category), user, overrideAccess false
  throw new Error('not implemented')
}

/** Creates (no `categoryId`) or renames a category in the menu's tenant. */
export const saveCategory = async (
  _payload: Payload,
  _user: TypedUser,
  _args: BuilderScope & { categoryId?: number; data: CategoryFormData },
): Promise<BuilderResult<{ category: BuilderCategory }>> => {
  // 1. categoryId → assertCategoryInTenant, then update title; else create with
  //    tenant = tenantId, sortOrder = last + 1
  // 2. ValidationError → refuse with its message (duplicate slug)
  // 3. logger.info created / renamed
  throw new Error('not implemented')
}

/** Saves the categories' order: `ids[i]` gets `sortOrder` i + 1. */
export const reorderCategories = async (
  _payload: Payload,
  _user: TypedUser,
  _args: BuilderScope & { ids: number[] },
): Promise<BuilderResult> => {
  // 1. every id must be a category of tenantId (one find with id in ids + tenant), else refuse
  // 2. update each whose sortOrder changes, user, overrideAccess false
  // 3. logger.info({ tenantId, count }, 'menu builder: categories reordered')
  throw new Error('not implemented')
}

/** The allergens and tags the item form offers. */
export const listLookups = async (
  _payload: Payload,
  _user: TypedUser,
  _args: BuilderScope,
): Promise<BuilderResult<{ allergens: BuilderLookup[]; tags: BuilderLookup[] }>> => {
  // 1. find menu-allergens and menu-tags where tenant = tenantId, sort title, pagination false
  throw new Error('not implemented')
}

/** Uploads the item photo to the tenant's media (the item form's image picker). */
export const uploadItemImage = async (
  _payload: Payload,
  _user: TypedUser,
  _args: BuilderScope & { file: { data: Buffer; name: string; mimetype: string; size: number } },
): Promise<BuilderResult<{ imageId: number; imageUrl: string | null }>> => {
  // 1. refuse anything that isn't image/* (plain words), or over the media size limit
  // 2. create media with tenant = tenantId, alt = file name without extension, user,
  //    overrideAccess false
  // 3. logger.info({ mediaId, tenantId, userId }, 'menu builder: image uploaded')
  throw new Error('not implemented')
}
