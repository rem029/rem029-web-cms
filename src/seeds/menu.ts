/**
 * Restaurant menu catalog (rem0017 phase 1): per seeded business (tenant1, tenant2), 5 categories,
 * the 14 common allergens, 4 tags and 15 items with prices, options on a few (Size, Milk), one item
 * switched off ("Show on menus" unticked) and one out of stock. tenant2 prices in QAR (Settings →
 * Currency), tenant1 keeps USD. Photos are left empty.
 *
 *   pnpm seed
 *
 * Runs after `multiTenancy` (needs the tenants). Idempotent: upserts categories and items by
 * tenant + slug, allergens and tags by tenant + English title. Phase 2 adds menus here.
 */
import type { Payload, Where } from 'payload'

import type { MenuItem } from '@/payload-types'

type Titles = { en: string; ar: string }

const BUSINESSES = [
  { slug: 'tenant1', currency: 'USD' as const },
  { slug: 'tenant2', currency: 'QAR' as const },
]

const CATEGORIES: { slug: string; title: Titles }[] = [
  { slug: 'breakfast', title: { en: 'Breakfast', ar: 'الفطور' } },
  { slug: 'starters', title: { en: 'Starters', ar: 'المقبلات' } },
  { slug: 'mains', title: { en: 'Mains', ar: 'الأطباق الرئيسية' } },
  { slug: 'desserts', title: { en: 'Desserts', ar: 'الحلويات' } },
  { slug: 'drinks', title: { en: 'Drinks', ar: 'المشروبات' } },
]

const ALLERGENS: Titles[] = [
  { en: 'Gluten', ar: 'الغلوتين' },
  { en: 'Crustaceans', ar: 'القشريات' },
  { en: 'Eggs', ar: 'البيض' },
  { en: 'Fish', ar: 'السمك' },
  { en: 'Peanuts', ar: 'الفول السوداني' },
  { en: 'Soy', ar: 'الصويا' },
  { en: 'Milk', ar: 'الحليب' },
  { en: 'Tree nuts', ar: 'المكسرات' },
  { en: 'Celery', ar: 'الكرفس' },
  { en: 'Mustard', ar: 'الخردل' },
  { en: 'Sesame', ar: 'السمسم' },
  { en: 'Sulphites', ar: 'الكبريتات' },
  { en: 'Lupin', ar: 'الترمس' },
  { en: 'Molluscs', ar: 'الرخويات' },
]

const TAGS: Titles[] = [
  { en: 'Vegan', ar: 'نباتي' },
  { en: 'Spicy', ar: 'حار' },
  { en: 'New', ar: 'جديد' },
  { en: "Chef's pick", ar: 'اختيار الشيف' },
]

type ModifierGroups = NonNullable<MenuItem['modifierGroups']>

// option groups with english and arabic labels; created in english, then the arabic labels are
// written on the same rows (by id), since a group's name and choices are required in each locale
type GroupSpec = {
  name: Titles
  inputType: 'checkbox' | 'radio'
  required: boolean
  options: Titles[]
}

const SIZE: GroupSpec[] = [
  {
    name: { en: 'Size', ar: 'الحجم' },
    inputType: 'radio',
    required: true,
    options: [
      { en: 'Regular', ar: 'عادي' },
      { en: 'Large', ar: 'كبير' },
    ],
  },
]

const MILK: GroupSpec[] = [
  {
    name: { en: 'Milk', ar: 'الحليب' },
    inputType: 'radio',
    required: false,
    options: [
      { en: 'Full fat', ar: 'كامل الدسم' },
      { en: 'Oat', ar: 'الشوفان' },
      { en: 'Almond', ar: 'اللوز' },
    ],
  },
]

const groupsIn = (groups: GroupSpec[], locale: 'en' | 'ar'): ModifierGroups =>
  groups.map((group) => ({
    name: group.name[locale],
    inputType: group.inputType,
    required: group.required,
    options: group.options.map((option) => ({ label: option[locale] })),
  }))

// the arabic labels on the saved rows: same ids, so the english labels stay
const arabicGroups = (saved: ModifierGroups, groups: GroupSpec[]): ModifierGroups =>
  saved.map((row, index) => ({
    ...row,
    name: groups[index]?.name.ar ?? row.name,
    options: row.options.map((option, optionIndex) => ({
      ...option,
      label: groups[index]?.options[optionIndex]?.ar ?? option.label,
    })),
  }))

type ItemSpec = {
  slug: string
  title: Titles
  description: string
  price: number
  category: string
  allergens?: string[]
  tags?: string[]
  availability?: MenuItem['availability']
  modifierGroups?: GroupSpec[]
  isActive?: boolean
  inStock?: boolean
}

const ITEMS: ItemSpec[] = [
  {
    slug: 'shakshuka',
    title: { en: 'Shakshuka', ar: 'شكشوكة' },
    description: 'Eggs poached in a spiced tomato and pepper sauce, with bread.',
    price: 9,
    category: 'breakfast',
    allergens: ['Eggs', 'Gluten'],
    availability: ['breakfast'],
  },
  {
    slug: 'foul-medames',
    title: { en: 'Foul medames', ar: 'فول مدمس' },
    description: 'Slow-cooked fava beans with olive oil, lemon and cumin.',
    price: 7,
    category: 'breakfast',
    tags: ['Vegan'],
    availability: ['breakfast'],
  },
  {
    slug: 'hummus',
    title: { en: 'Hummus', ar: 'حمص' },
    description: 'Chickpeas, tahini and lemon, with warm bread.',
    price: 6,
    category: 'starters',
    allergens: ['Sesame', 'Gluten'],
    tags: ['Vegan'],
  },
  {
    slug: 'fattoush',
    title: { en: 'Fattoush', ar: 'فتوش' },
    description: 'Crisp vegetables, toasted bread and sumac dressing.',
    price: 7,
    category: 'starters',
    allergens: ['Gluten'],
    tags: ['Vegan'],
  },
  {
    slug: 'lentil-soup',
    title: { en: 'Lentil soup', ar: 'شوربة العدس' },
    description: 'Red lentils with cumin and a squeeze of lemon.',
    price: 6,
    category: 'starters',
    allergens: ['Celery'],
    tags: ['Vegan'],
  },
  {
    slug: 'seasonal-soup',
    title: { en: 'Seasonal soup', ar: 'شوربة الموسم' },
    description: "Ask your waiter about this week's soup.",
    price: 7,
    category: 'starters',
    isActive: false,
  },
  {
    slug: 'mixed-grill',
    title: { en: 'Mixed grill', ar: 'مشاوي مشكلة' },
    description: 'Lamb kofta, chicken and beef skewers with rice.',
    price: 24,
    category: 'mains',
    tags: ["Chef's pick"],
    availability: ['lunch', 'dinner'],
  },
  {
    slug: 'chicken-machboos',
    title: { en: 'Chicken machboos', ar: 'مجبوس دجاج' },
    description: 'Spiced rice with slow-cooked chicken and dried lime.',
    price: 18,
    category: 'mains',
    tags: ['Spicy'],
    availability: ['lunch', 'dinner'],
  },
  {
    slug: 'grilled-hammour',
    title: { en: 'Grilled hammour', ar: 'هامور مشوي' },
    description: 'Local grouper, grilled, with lemon and herbs.',
    price: 28,
    category: 'mains',
    allergens: ['Fish'],
    availability: ['dinner'],
  },
  {
    slug: 'falafel-wrap',
    title: { en: 'Falafel wrap', ar: 'لفافة فلافل' },
    description: 'Falafel, tahini, pickles and salad in flatbread.',
    price: 10,
    category: 'mains',
    allergens: ['Sesame', 'Gluten'],
    tags: ['Vegan', 'New'],
    modifierGroups: SIZE,
  },
  {
    slug: 'umm-ali',
    title: { en: 'Umm ali', ar: 'أم علي' },
    description: 'Warm pastry pudding with milk, nuts and raisins.',
    price: 8,
    category: 'desserts',
    allergens: ['Milk', 'Tree nuts', 'Gluten'],
  },
  {
    slug: 'kunafa',
    title: { en: 'Kunafa', ar: 'كنافة' },
    description: 'Crisp pastry over sweet cheese, with syrup.',
    price: 9,
    category: 'desserts',
    allergens: ['Milk', 'Gluten', 'Tree nuts'],
    tags: ["Chef's pick"],
  },
  {
    slug: 'karak-tea',
    title: { en: 'Karak tea', ar: 'شاي كرك' },
    description: 'Strong tea with cardamom and evaporated milk.',
    price: 3,
    category: 'drinks',
    allergens: ['Milk'],
    modifierGroups: SIZE,
  },
  {
    slug: 'iced-latte',
    title: { en: 'Iced latte', ar: 'لاتيه مثلج' },
    description: 'Double espresso over ice with milk.',
    price: 5,
    category: 'drinks',
    allergens: ['Milk'],
    modifierGroups: [...SIZE, ...MILK],
    inStock: false,
  },
  {
    slug: 'fresh-lemon-mint',
    title: { en: 'Lemon mint', ar: 'ليمون بالنعناع' },
    description: 'Fresh lemon juice blended with mint and ice.',
    price: 4,
    category: 'drinks',
    tags: ['Vegan'],
  },
]

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

// allergens and tags have no slug: upsert by the English title
const upsertNamed = async (
  payload: Payload,
  collection: 'menu-allergens' | 'menu-tags',
  tenantId: number,
  title: Titles,
): Promise<number> => {
  const { docs } = await payload.find({
    collection,
    where: inTenant(tenantId, { title: { equals: title.en } }),
    locale: 'en',
    limit: 1,
    depth: 0,
  })
  const doc =
    docs[0] ??
    (await payload.create({
      collection,
      data: { title: title.en, tenant: tenantId },
      locale: 'en',
    }))
  await payload.update({ collection, id: doc.id, data: { title: title.ar }, locale: 'ar' })
  return doc.id
}

const pick = (ids: Map<string, number>, names: string[] = []): number[] =>
  names.map((name) => ids.get(name)).filter((id): id is number => id !== undefined)

const upsertItem = async (
  payload: Payload,
  tenantId: number,
  spec: ItemSpec,
  lookups: {
    categories: Map<string, number>
    allergens: Map<string, number>
    tags: Map<string, number>
  },
): Promise<'created' | 'updated'> => {
  const { docs } = await payload.find({
    collection: 'menu-items',
    where: inTenant(tenantId, { slug: { equals: spec.slug } }),
    limit: 1,
    depth: 0,
  })
  const data = {
    title: spec.title.en,
    slug: spec.slug,
    description: spec.description,
    price: spec.price,
    category: lookups.categories.get(spec.category) ?? null,
    allergens: pick(lookups.allergens, spec.allergens),
    tags: pick(lookups.tags, spec.tags),
    availability: spec.availability ?? ['all_day'],
    modifierGroups: groupsIn(spec.modifierGroups ?? [], 'en'),
    isActive: spec.isActive ?? true,
    inStock: spec.inStock ?? true,
    tenant: tenantId,
  }
  const doc = docs[0]
    ? await payload.update({ collection: 'menu-items', id: docs[0].id, data, locale: 'en' })
    : await payload.create({ collection: 'menu-items', data, locale: 'en' })
  // the description falls back to english
  await payload.update({
    collection: 'menu-items',
    id: doc.id,
    data: {
      title: spec.title.ar,
      modifierGroups: arabicGroups(doc.modifierGroups ?? [], spec.modifierGroups ?? []),
    },
    locale: 'ar',
  })
  return docs[0] ? 'updated' : 'created'
}

const setCurrency = async (
  payload: Payload,
  tenantId: number,
  currency: (typeof BUSINESSES)[number]['currency'],
): Promise<void> => {
  const { docs } = await payload.find({
    collection: 'settings',
    where: { tenant: { equals: tenantId } },
    limit: 1,
    depth: 0,
  })
  if (!docs[0]) {
    payload.logger.warn({ msg: 'seed: menu: no settings doc', tenantId })
    return
  }
  await payload.update({
    collection: 'settings',
    id: docs[0].id,
    data: { currency },
    context: { disableRevalidate: true },
  })
}

export const seedMenu = async (payload: Payload): Promise<void> => {
  for (const business of BUSINESSES) {
    const { docs } = await payload.find({
      collection: 'tenants',
      where: { slug: { equals: business.slug } },
      limit: 1,
      depth: 0,
    })
    const tenant = docs[0]
    if (!tenant) {
      payload.logger.warn({ msg: 'seed: menu: tenant missing, skipped', tenant: business.slug })
      continue
    }

    const categories = new Map<string, number>()
    for (const [index, category] of CATEGORIES.entries()) {
      categories.set(
        category.slug,
        await upsertCategory(payload, tenant.id, category.slug, category.title, index),
      )
    }
    const allergens = new Map<string, number>()
    for (const allergen of ALLERGENS) {
      allergens.set(allergen.en, await upsertNamed(payload, 'menu-allergens', tenant.id, allergen))
    }
    const tags = new Map<string, number>()
    for (const tag of TAGS) {
      tags.set(tag.en, await upsertNamed(payload, 'menu-tags', tenant.id, tag))
    }

    const counts = { created: 0, updated: 0 }
    for (const item of ITEMS) {
      counts[await upsertItem(payload, tenant.id, item, { categories, allergens, tags })] += 1
    }
    await setCurrency(payload, tenant.id, business.currency)

    payload.logger.info({ msg: 'seed: menu', tenant: business.slug, items: counts })
  }
}
