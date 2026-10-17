/**
 * The menu catalog for the restaurant-menu tests (`TEST_MENU`, rem0017 phase 1): in test-a and
 * test-b, the categories starters (sortOrder 1) and mains (2), the allergen Gluten, the tag Vegan,
 * and the items tomato-soup (starters, Gluten), grilled-steak (mains) and fresh-lemonade (no
 * category); in test-a only, seasonal-special with "Show on menus" unticked. English and Arabic
 * titles. Upserts by tenant + slug (allergen and tag by tenant + English title).
 */
import type { Payload } from 'payload'

import type { TenantIds } from './fixtures'

export const seedTestMenu = async (_payload: Payload, _tenants: TenantIds): Promise<void> => {
  // 1. for tenants a and b: upsert the categories (en + ar title, sortOrder) → ids by slug
  // 2. upsert the Gluten allergen and the Vegan tag (en + ar)
  // 3. upsert soup, steak, lemonade with price, category, allergens/tags (en + ar titles)
  // 4. test-a only: upsert seasonal-special with isActive false
  // 5. payload.logger.info(`test seed: menu catalog in ${tenantSlug}`)
  // written with the test bodies (implementation); a no-op until then so the suite still runs
}
