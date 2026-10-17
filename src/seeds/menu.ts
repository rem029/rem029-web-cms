/**
 * Restaurant menu catalog (rem0017 phase 1): per seeded business (tenant1, tenant2), 5 categories,
 * the 14 common allergens, 4 tags and ~15 items with prices, photos left empty, options on a few
 * (Size, Milk), one item switched off ("Show on menus" unticked) and one out of stock. tenant2
 * prices in QAR (Settings → Currency), tenant1 keeps USD.
 *
 *   pnpm seed
 *
 * Runs after `multiTenancy` (needs the tenants). Idempotent: upserts by tenant + slug (categories,
 * items) or tenant + English title (allergens, tags). Phase 2 adds menus here.
 */
import type { Payload } from 'payload'

export const seedMenu = async (_payload: Payload): Promise<void> => {
  // 1. for each seeded business slug (tenant1, tenant2): find the tenant; missing → logger.warn, skip
  // 2. upsert CATEGORIES (en + ar titles, sortOrder) → ids by slug
  // 3. upsert ALLERGENS and TAGS (en + ar titles) → ids by English title
  // 4. upsert ITEMS: title en/ar, price, category, allergens, tags, availability, modifierGroups;
  //    'seasonal-soup' isActive false, 'iced-latte' inStock false
  // 5. tenant2's Settings → currency 'QAR'
  // 6. logger.info({ msg: 'seed: menu', tenant, created, updated }) per business
  throw new Error('not implemented')
}
