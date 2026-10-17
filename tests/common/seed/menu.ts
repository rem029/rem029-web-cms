/**
 * The menu catalog for the restaurant-menu tests (`TEST_MENU`, rem0017 phase 1): in test-a and
 * test-b, the categories starters (sortOrder 1) and mains (2), the allergen Gluten, the tag Vegan,
 * and the items tomato-soup (starters, Gluten), grilled-steak (mains) and fresh-lemonade (no
 * category); in test-a only, seasonal-special with "Show on menus" unticked. English and Arabic
 * titles. Upserts by tenant + slug (allergen and tag by tenant + English title).
 */
import type { Payload, Where } from 'payload'

import { TEST_MENU, TEST_TENANTS, type TenantIds } from './fixtures'

type Titles = { en: string; ar: string }

const inTenant = (tenantId: number, where: Where): Where => ({
  and: [{ tenant: { equals: tenantId } }, where],
})

const upsertCategory = async (
  payload: Payload,
  tenantId: number,
  slug: string,
  title: Titles,
  sortOrder: number,
): Promise<number> => {
  const { docs } = await payload.find({
    collection: 'menu-categories',
    where: inTenant(tenantId, { slug: { equals: slug } }),
    limit: 1,
    depth: 0,
  })
  const data = { title: title.en, slug, sortOrder, tenant: tenantId }
  const doc = docs[0]
    ? await payload.update({ collection: 'menu-categories', id: docs[0].id, data, locale: 'en' })
    : await payload.create({ collection: 'menu-categories', data, locale: 'en' })
  await payload.update({
    collection: 'menu-categories',
    id: doc.id,
    data: { title: title.ar },
    locale: 'ar',
  })
  return doc.id
}

const upsertAllergen = async (
  payload: Payload,
  tenantId: number,
  title: Titles,
): Promise<number> => {
  const { docs } = await payload.find({
    collection: 'menu-allergens',
    where: inTenant(tenantId, { title: { equals: title.en } }),
    locale: 'en',
    limit: 1,
    depth: 0,
  })
  const doc =
    docs[0] ??
    (await payload.create({
      collection: 'menu-allergens',
      data: { title: title.en, tenant: tenantId },
      locale: 'en',
    }))
  await payload.update({
    collection: 'menu-allergens',
    id: doc.id,
    data: { title: title.ar },
    locale: 'ar',
  })
  return doc.id
}

const upsertTag = async (payload: Payload, tenantId: number, title: Titles): Promise<number> => {
  const { docs } = await payload.find({
    collection: 'menu-tags',
    where: inTenant(tenantId, { title: { equals: title.en } }),
    locale: 'en',
    limit: 1,
    depth: 0,
  })
  const doc =
    docs[0] ??
    (await payload.create({
      collection: 'menu-tags',
      data: { title: title.en, tenant: tenantId },
      locale: 'en',
    }))
  await payload.update({
    collection: 'menu-tags',
    id: doc.id,
    data: { title: title.ar },
    locale: 'ar',
  })
  return doc.id
}

type ItemSpec = {
  slug: string
  title: Titles
  price: number
  category?: number
  allergens?: number[]
  tags?: number[]
  isActive?: boolean
}

const upsertItem = async (payload: Payload, tenantId: number, spec: ItemSpec): Promise<number> => {
  const { docs } = await payload.find({
    collection: 'menu-items',
    where: inTenant(tenantId, { slug: { equals: spec.slug } }),
    limit: 1,
    depth: 0,
  })
  const data = {
    title: spec.title.en,
    slug: spec.slug,
    price: spec.price,
    category: spec.category ?? null,
    allergens: spec.allergens ?? [],
    tags: spec.tags ?? [],
    isActive: spec.isActive ?? true,
    inStock: true,
    tenant: tenantId,
  }
  const doc = docs[0]
    ? await payload.update({ collection: 'menu-items', id: docs[0].id, data, locale: 'en' })
    : await payload.create({ collection: 'menu-items', data, locale: 'en' })
  await payload.update({
    collection: 'menu-items',
    id: doc.id,
    data: { title: spec.title.ar },
    locale: 'ar',
  })
  return doc.id
}

const seedCatalog = async (
  payload: Payload,
  tenantId: number,
  tenantSlug: string,
): Promise<void> => {
  const starters = await upsertCategory(
    payload,
    tenantId,
    TEST_MENU.starters,
    { en: 'Starters', ar: 'المقبلات' },
    1,
  )
  const mains = await upsertCategory(
    payload,
    tenantId,
    TEST_MENU.mains,
    { en: 'Mains', ar: 'الأطباق الرئيسية' },
    2,
  )
  const gluten = await upsertAllergen(payload, tenantId, { en: TEST_MENU.gluten, ar: 'الغلوتين' })
  const vegan = await upsertTag(payload, tenantId, { en: TEST_MENU.vegan, ar: 'نباتي' })

  await upsertItem(payload, tenantId, {
    slug: TEST_MENU.soup,
    title: { en: 'Tomato soup', ar: 'شوربة الطماطم' },
    price: 8,
    category: starters,
    allergens: [gluten],
    tags: [vegan],
  })
  await upsertItem(payload, tenantId, {
    slug: TEST_MENU.steak,
    title: { en: 'Grilled steak', ar: 'ستيك مشوي' },
    price: 32,
    category: mains,
  })
  await upsertItem(payload, tenantId, {
    slug: TEST_MENU.lemonade,
    title: { en: 'Fresh lemonade', ar: 'ليمونادة طازجة' },
    price: 5,
  })
  payload.logger.info(`test seed: menu catalog in ${tenantSlug}`)
}

export const seedTestMenu = async (payload: Payload, tenants: TenantIds): Promise<void> => {
  await seedCatalog(payload, tenants.a, TEST_TENANTS.a)
  await seedCatalog(payload, tenants.b, TEST_TENANTS.b)
  await upsertItem(payload, tenants.a, {
    slug: TEST_MENU.inactiveItem,
    title: { en: 'Seasonal special', ar: 'طبق الموسم' },
    price: 14,
    isActive: false,
  })
}
