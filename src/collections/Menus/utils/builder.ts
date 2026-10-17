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
import {
  Forbidden,
  ValidationError,
  type Payload,
  type RequestContext,
  type TypedUser,
  type Where,
} from 'payload'

import type { Availability } from '@/common/fields/menuFields'
import { isDisabledUser } from '@/common/utils/access'
import { tenantCurrency } from '@/common/utils/tenantCurrency'
import type { MenuCategory, MenuItem } from '@/payload-types'

import type {
  BuilderCategory,
  BuilderItem,
  BuilderLookup,
  BuilderRefusal,
  BuilderResult,
  BuilderScope,
  CategoryFormData,
  ItemFormData,
  QuickItemUpdate,
} from '../components/builderTypes'

type Locale = 'en' | 'ar'

/** Passed to every write; scripts and tests outside Next.js set `disableRevalidate`. */
export type BuilderOptions = { context?: RequestContext }

const MAX_IMAGE_BYTES = 10 * 1024 * 1024

const NOT_ALLOWED_ITEMS = "You don't have permission to edit items. Ask your admin."
const NOT_ALLOWED_CATEGORIES = "You don't have permission to edit categories. Ask your admin."
const NOT_ALLOWED_READ = "You can't open this business's menu items. Ask your admin."
const OTHER_ITEM = 'You can only edit items of this business.'
const OTHER_CATEGORY = 'You can only use categories of this business.'

const toLocale = (locale: string | undefined): Locale => (locale === 'ar' ? 'ar' : 'en')

const inTenant = (tenantId: number, where?: Where): Where =>
  where ? { and: [{ tenant: { equals: tenantId } }, where] } : { tenant: { equals: tenantId } }

const idOf = (value: unknown): number | null => {
  if (typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value && typeof value.id === 'number') {
    return value.id
  }
  return null
}

const idsOf = (values: unknown): number[] =>
  Array.isArray(values) ? values.map(idOf).filter((id): id is number => id !== null) : []

const refuse = (
  payload: Payload,
  user: TypedUser,
  action: string,
  scope: { tenantId: number } & Record<string, unknown>,
  error: string,
): BuilderRefusal => {
  payload.logger.warn({ ...scope, userId: user.id, action, reason: error }, 'menu builder: refused')
  return { ok: false, error }
}

/** A thrown Local API error as a refusal: access and validation in plain words, the rest logged. */
const failure = (
  payload: Payload,
  user: TypedUser,
  action: string,
  scope: { tenantId: number } & Record<string, unknown>,
  err: unknown,
  forbidden: string,
): BuilderRefusal => {
  if (err instanceof Forbidden) return refuse(payload, user, action, scope, forbidden)
  if (err instanceof ValidationError) {
    const first = err.data.errors[0]?.message
    return refuse(payload, user, action, scope, first ?? err.message)
  }
  payload.logger.error({ ...scope, userId: user.id, action, err }, 'menu builder: failed')
  return { ok: false, error: 'Something went wrong. Try again.' }
}

/** Disabled users get nothing (their access already denies, this says so in plain words). */
const disabledRefusal = (
  payload: Payload,
  user: TypedUser,
  action: string,
  tenantId: number,
): BuilderRefusal | null =>
  isDisabledUser(user)
    ? refuse(payload, user, action, { tenantId }, 'Your account is disabled. Ask your admin.')
    : null

const imageUrlOf = (image: MenuItem['image']): string | null => {
  if (!image || typeof image !== 'object') return null
  return image.sizes?.thumbnail?.url ?? image.url ?? null
}

const toBuilderItem = (doc: MenuItem): BuilderItem => {
  const category = doc.category && typeof doc.category === 'object' ? doc.category : null
  return {
    id: doc.id,
    title: doc.title,
    slug: doc.slug ?? '',
    price: doc.price,
    categoryId: category?.id ?? idOf(doc.category),
    categoryTitle: category?.title ?? null,
    imageUrl: imageUrlOf(doc.image),
    inStock: doc.inStock !== false,
    isActive: doc.isActive !== false,
  }
}

const toBuilderCategory = (doc: MenuCategory, itemCount: number): BuilderCategory => ({
  id: doc.id,
  title: doc.title,
  sortOrder: doc.sortOrder ?? 0,
  itemCount,
})

/** One item of the tenant as the user may read it, or null (another tenant's, or no read). */
const findItemInTenant = async (
  payload: Payload,
  user: TypedUser,
  tenantId: number,
  itemId: number,
  locale: Locale,
): Promise<MenuItem | null> => {
  const { docs } = await payload.find({
    collection: 'menu-items',
    where: inTenant(tenantId, { id: { equals: itemId } }),
    limit: 1,
    depth: 0,
    locale,
    user,
    overrideAccess: false,
  })
  return docs[0] ?? null
}

const categoryInTenant = async (
  payload: Payload,
  user: TypedUser,
  tenantId: number,
  categoryId: number,
): Promise<boolean> => {
  const { totalDocs } = await payload.count({
    collection: 'menu-categories',
    where: inTenant(tenantId, { id: { equals: categoryId } }),
    user,
    overrideAccess: false,
  })
  return totalDocs > 0
}

/** Items panel: the tenant's items (active or not), filtered by category and title. */
export const listBuilderItems = async (
  payload: Payload,
  user: TypedUser,
  args: BuilderScope & { categoryId?: number | null; search?: string },
): Promise<BuilderResult<{ items: BuilderItem[]; currency: string }>> => {
  const { tenantId } = args
  const disabled = disabledRefusal(payload, user, 'listItems', tenantId)
  if (disabled) return disabled

  const filters: Where[] = []
  if (args.categoryId) filters.push({ category: { equals: args.categoryId } })
  const search = args.search?.trim()
  if (search) filters.push({ title: { like: search } })

  try {
    const { docs } = await payload.find({
      collection: 'menu-items',
      where: inTenant(tenantId, filters.length ? { and: filters } : undefined),
      sort: 'title',
      depth: 1,
      pagination: false,
      locale: toLocale(args.locale),
      user,
      overrideAccess: false,
    })
    return {
      ok: true,
      items: docs.map(toBuilderItem),
      // read without access, once the user's own read of the items worked
      currency: await tenantCurrency(payload, tenantId),
    }
  } catch (err) {
    return failure(payload, user, 'listItems', { tenantId }, err, NOT_ALLOWED_READ)
  }
}

/** "Add all to this menu": every active item of one category, in title order. */
export const listItemsOfCategory = async (
  payload: Payload,
  user: TypedUser,
  args: BuilderScope & { categoryId: number },
): Promise<BuilderResult<{ itemIds: number[] }>> => {
  const { tenantId, categoryId } = args
  const disabled = disabledRefusal(payload, user, 'listItemsOfCategory', tenantId)
  if (disabled) return disabled

  try {
    const { docs } = await payload.find({
      collection: 'menu-items',
      where: inTenant(tenantId, {
        and: [{ category: { equals: categoryId } }, { isActive: { equals: true } }],
      }),
      sort: 'title',
      depth: 0,
      pagination: false,
      locale: toLocale(args.locale),
      user,
      overrideAccess: false,
    })
    return { ok: true, itemIds: docs.map((doc) => doc.id) }
  } catch (err) {
    return failure(
      payload,
      user,
      'listItemsOfCategory',
      { tenantId, categoryId },
      err,
      NOT_ALLOWED_READ,
    )
  }
}

/** Inline edits from the items panel (price, stock, shown, category); saves the item now. */
export const quickUpdateItem = async (
  payload: Payload,
  user: TypedUser,
  args: BuilderScope & { itemId: number; data: QuickItemUpdate },
  options: BuilderOptions = {},
): Promise<BuilderResult<{ item: BuilderItem }>> => {
  const { tenantId, itemId } = args
  const locale = toLocale(args.locale)
  const scope = { tenantId, itemId }
  const disabled = disabledRefusal(payload, user, 'quickUpdateItem', tenantId)
  if (disabled) return disabled

  // only the keys the panel edits, nothing else from the client
  const data: QuickItemUpdate = {}
  if (typeof args.data.price === 'number') data.price = args.data.price
  if (typeof args.data.inStock === 'boolean') data.inStock = args.data.inStock
  if (typeof args.data.isActive === 'boolean') data.isActive = args.data.isActive
  if (args.data.category !== undefined) data.category = args.data.category

  try {
    if (!(await findItemInTenant(payload, user, tenantId, itemId, locale))) {
      return refuse(payload, user, 'quickUpdateItem', scope, OTHER_ITEM)
    }
    if (data.category && !(await categoryInTenant(payload, user, tenantId, data.category))) {
      return refuse(payload, user, 'quickUpdateItem', scope, OTHER_CATEGORY)
    }
    const doc = await payload.update({
      collection: 'menu-items',
      id: itemId,
      data,
      depth: 1,
      locale,
      user,
      overrideAccess: false,
      context: options.context,
    })
    payload.logger.info(
      { ...scope, userId: user.id, fields: Object.keys(data) },
      'menu builder: item updated',
    )
    return { ok: true, item: toBuilderItem(doc) }
  } catch (err) {
    return failure(payload, user, 'quickUpdateItem', scope, err, NOT_ALLOWED_ITEMS)
  }
}

/** The item form (`ItemFormModal`) for an existing item, in the admin locale. */
export const getItemForm = async (
  payload: Payload,
  user: TypedUser,
  args: BuilderScope & { itemId: number },
): Promise<BuilderResult<{ data: ItemFormData; imageUrl: string | null }>> => {
  const { tenantId, itemId } = args
  const disabled = disabledRefusal(payload, user, 'getItemForm', tenantId)
  if (disabled) return disabled

  try {
    const doc = await findItemInTenant(payload, user, tenantId, itemId, toLocale(args.locale))
    if (!doc) {
      return refuse(
        payload,
        user,
        'getItemForm',
        { tenantId, itemId },
        'This item is no longer available.',
      )
    }
    const image = doc.image && typeof doc.image === 'object' ? doc.image : null
    return {
      ok: true,
      imageUrl: imageUrlOf(image),
      data: {
        title: doc.title,
        price: doc.price,
        category: idOf(doc.category),
        description: doc.description ?? '',
        image: idOf(doc.image),
        allergens: idsOf(doc.allergens),
        tags: idsOf(doc.tags),
        availability: (doc.availability ?? []).filter((value): value is Availability =>
          Boolean(value),
        ),
        inStock: doc.inStock !== false,
        isActive: doc.isActive !== false,
        modifierGroups: (doc.modifierGroups ?? []).map((group) => ({
          name: group.name,
          inputType: group.inputType,
          required: group.required === true,
          options: (group.options ?? []).map((option) => ({ label: option.label })),
        })),
      },
    }
  } catch (err) {
    return failure(payload, user, 'getItemForm', { tenantId, itemId }, err, NOT_ALLOWED_READ)
  }
}

/** Creates (no `itemId`) or updates an item from the full form, in the menu's tenant. */
export const saveItem = async (
  payload: Payload,
  user: TypedUser,
  args: BuilderScope & { itemId?: number; data: ItemFormData },
  options: BuilderOptions = {},
): Promise<BuilderResult<{ item: BuilderItem }>> => {
  const { tenantId, itemId } = args
  const locale = toLocale(args.locale)
  const scope = { tenantId, itemId }
  const disabled = disabledRefusal(payload, user, 'saveItem', tenantId)
  if (disabled) return disabled

  const form = args.data
  // the form's fields only (the same-tenant hook checks category, allergens and tags)
  const data = {
    title: form.title.trim(),
    price: form.price,
    category: form.category,
    description: form.description,
    image: form.image,
    allergens: form.allergens,
    tags: form.tags,
    availability: form.availability,
    inStock: form.inStock,
    isActive: form.isActive,
    modifierGroups: form.modifierGroups,
  }

  try {
    if (itemId === undefined) {
      const doc = await payload.create({
        collection: 'menu-items',
        data: { ...data, tenant: tenantId },
        depth: 1,
        locale,
        user,
        overrideAccess: false,
        context: options.context,
      })
      payload.logger.info(
        { tenantId, itemId: doc.id, userId: user.id },
        'menu builder: item created',
      )
      return { ok: true, item: toBuilderItem(doc) }
    }
    if (!(await findItemInTenant(payload, user, tenantId, itemId, locale))) {
      return refuse(payload, user, 'saveItem', scope, OTHER_ITEM)
    }
    const doc = await payload.update({
      collection: 'menu-items',
      id: itemId,
      data,
      depth: 1,
      locale,
      user,
      overrideAccess: false,
      context: options.context,
    })
    payload.logger.info({ ...scope, userId: user.id }, 'menu builder: item saved')
    return { ok: true, item: toBuilderItem(doc) }
  } catch (err) {
    return failure(payload, user, 'saveItem', scope, err, NOT_ALLOWED_ITEMS)
  }
}

/** Categories panel: the tenant's categories in sort order, with how many items each has. */
export const listBuilderCategories = async (
  payload: Payload,
  user: TypedUser,
  args: BuilderScope,
): Promise<BuilderResult<{ categories: BuilderCategory[] }>> => {
  const { tenantId } = args
  const disabled = disabledRefusal(payload, user, 'listCategories', tenantId)
  if (disabled) return disabled

  try {
    const { docs } = await payload.find({
      collection: 'menu-categories',
      where: inTenant(tenantId),
      sort: ['sortOrder', 'title'],
      depth: 0,
      pagination: false,
      locale: toLocale(args.locale),
      user,
      overrideAccess: false,
    })
    const categories = await Promise.all(
      docs.map(async (doc) => {
        const { totalDocs } = await payload.count({
          collection: 'menu-items',
          where: inTenant(tenantId, { category: { equals: doc.id } }),
          user,
          overrideAccess: false,
        })
        return toBuilderCategory(doc, totalDocs)
      }),
    )
    return { ok: true, categories }
  } catch (err) {
    return failure(payload, user, 'listCategories', { tenantId }, err, NOT_ALLOWED_READ)
  }
}

/** Creates (no `categoryId`) or renames a category in the menu's tenant. */
export const saveCategory = async (
  payload: Payload,
  user: TypedUser,
  args: BuilderScope & { categoryId?: number; data: CategoryFormData },
  options: BuilderOptions = {},
): Promise<BuilderResult<{ category: BuilderCategory }>> => {
  const { tenantId, categoryId } = args
  const locale = toLocale(args.locale)
  const scope = { tenantId, categoryId }
  const disabled = disabledRefusal(payload, user, 'saveCategory', tenantId)
  if (disabled) return disabled

  const title = args.data.title.trim()
  if (!title) return refuse(payload, user, 'saveCategory', scope, 'Give the category a name.')

  try {
    if (categoryId === undefined) {
      const { docs: last } = await payload.find({
        collection: 'menu-categories',
        where: inTenant(tenantId),
        sort: '-sortOrder',
        limit: 1,
        depth: 0,
        user,
        overrideAccess: false,
      })
      const doc = await payload.create({
        collection: 'menu-categories',
        data: { title, sortOrder: (last[0]?.sortOrder ?? 0) + 1, tenant: tenantId },
        depth: 0,
        locale,
        user,
        overrideAccess: false,
        context: options.context,
      })
      payload.logger.info(
        { tenantId, categoryId: doc.id, userId: user.id },
        'menu builder: category created',
      )
      return { ok: true, category: toBuilderCategory(doc, 0) }
    }
    if (!(await categoryInTenant(payload, user, tenantId, categoryId))) {
      return refuse(payload, user, 'saveCategory', scope, OTHER_CATEGORY)
    }
    const doc = await payload.update({
      collection: 'menu-categories',
      id: categoryId,
      data: { title },
      depth: 0,
      locale,
      user,
      overrideAccess: false,
      context: options.context,
    })
    const { totalDocs } = await payload.count({
      collection: 'menu-items',
      where: inTenant(tenantId, { category: { equals: categoryId } }),
      user,
      overrideAccess: false,
    })
    payload.logger.info({ ...scope, userId: user.id }, 'menu builder: category renamed')
    return { ok: true, category: toBuilderCategory(doc, totalDocs) }
  } catch (err) {
    return failure(payload, user, 'saveCategory', scope, err, NOT_ALLOWED_CATEGORIES)
  }
}

/** Saves the categories' order: `ids[i]` gets `sortOrder` i + 1. */
export const reorderCategories = async (
  payload: Payload,
  user: TypedUser,
  args: BuilderScope & { ids: number[] },
  options: BuilderOptions = {},
): Promise<BuilderResult> => {
  const { tenantId, ids } = args
  const disabled = disabledRefusal(payload, user, 'reorderCategories', tenantId)
  if (disabled) return disabled

  try {
    const { docs } = await payload.find({
      collection: 'menu-categories',
      where: inTenant(tenantId, { id: { in: ids } }),
      depth: 0,
      pagination: false,
      user,
      overrideAccess: false,
    })
    if (docs.length !== new Set(ids).size) {
      return refuse(payload, user, 'reorderCategories', { tenantId, ids }, OTHER_CATEGORY)
    }
    let changed = 0
    for (const [index, id] of ids.entries()) {
      const sortOrder = index + 1
      if (docs.find((doc) => doc.id === id)?.sortOrder === sortOrder) continue
      await payload.update({
        collection: 'menu-categories',
        id,
        data: { sortOrder },
        depth: 0,
        user,
        overrideAccess: false,
        context: options.context,
      })
      changed += 1
    }
    payload.logger.info(
      { tenantId, changed, userId: user.id },
      'menu builder: categories reordered',
    )
    return { ok: true }
  } catch (err) {
    return failure(
      payload,
      user,
      'reorderCategories',
      { tenantId, ids },
      err,
      NOT_ALLOWED_CATEGORIES,
    )
  }
}

/** The allergens and tags the item form offers. */
export const listLookups = async (
  payload: Payload,
  user: TypedUser,
  args: BuilderScope,
): Promise<BuilderResult<{ allergens: BuilderLookup[]; tags: BuilderLookup[] }>> => {
  const { tenantId } = args
  const disabled = disabledRefusal(payload, user, 'listLookups', tenantId)
  if (disabled) return disabled

  const options = {
    where: inTenant(tenantId),
    sort: 'title',
    depth: 0,
    pagination: false,
    locale: toLocale(args.locale),
    user,
    overrideAccess: false,
  } as const
  try {
    const [allergens, tags] = await Promise.all([
      payload.find({ ...options, collection: 'menu-allergens' }),
      payload.find({ ...options, collection: 'menu-tags' }),
    ])
    const toLookup = (doc: { id: number; title: string }): BuilderLookup => ({
      id: doc.id,
      title: doc.title,
    })
    return { ok: true, allergens: allergens.docs.map(toLookup), tags: tags.docs.map(toLookup) }
  } catch (err) {
    return failure(payload, user, 'listLookups', { tenantId }, err, NOT_ALLOWED_READ)
  }
}

/** Uploads the item photo to the tenant's media (the item form's image picker). */
export const uploadItemImage = async (
  payload: Payload,
  user: TypedUser,
  args: BuilderScope & { file: { data: Buffer; name: string; mimetype: string; size: number } },
  options: BuilderOptions = {},
): Promise<BuilderResult<{ imageId: number; imageUrl: string | null }>> => {
  const { tenantId, file } = args
  const scope = { tenantId, fileName: file.name }
  const disabled = disabledRefusal(payload, user, 'uploadItemImage', tenantId)
  if (disabled) return disabled

  if (!file.mimetype.startsWith('image/')) {
    return refuse(payload, user, 'uploadItemImage', scope, 'Pick an image file (JPG, PNG or WebP).')
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return refuse(
      payload,
      user,
      'uploadItemImage',
      scope,
      'The image is too big. Pick one under 10 MB.',
    )
  }

  try {
    const doc = await payload.create({
      collection: 'media',
      data: { alt: file.name.replace(/\.[^.]+$/, ''), tenant: tenantId },
      file,
      depth: 0,
      user,
      overrideAccess: false,
      context: options.context,
    })
    payload.logger.info(
      { tenantId, mediaId: doc.id, userId: user.id },
      'menu builder: image uploaded',
    )
    return { ok: true, imageId: doc.id, imageUrl: doc.sizes?.thumbnail?.url ?? doc.url ?? null }
  } catch (err) {
    return failure(
      payload,
      user,
      'uploadItemImage',
      scope,
      err,
      "You don't have permission to upload images. Ask your admin.",
    )
  }
}
