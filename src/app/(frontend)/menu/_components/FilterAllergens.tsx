'use client'

import type { TypedLocale } from 'payload'
import React from 'react'

export type FilterAllergensProps = {
  /** the allergens on this menu's items (`allergensOf`) */
  allergens: { id: number; title: string }[]
  locale: TypedLocale
}

/**
 * "Show items with": one toggle chip per allergen on the menu (sdq `filter-allergens.tsx`);
 * picked chips are `aria-pressed` and the menu then shows only items containing one of them.
 * Reads and writes the store's `allergens`. Nothing shown when the menu has no allergens.
 */
export const FilterAllergens: React.FC<FilterAllergensProps> = (props) => {
  // 1. allergens empty → null
  // 2. picked = useMenuStore(s => s.allergens), setAllergens = useMenuStore(s => s.setAllergens)
  // 3. <fieldset><legend>t.withAllergens</legend> a button per allergen, aria-pressed when
  //    picked; click toggles its id → setAllergens
  void props
  return null
}
