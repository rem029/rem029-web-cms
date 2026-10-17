'use client'

import type { TypedLocale } from 'payload'
import React from 'react'

export type FilterAllergensProps = {
  allergens: { id: number; title: string }[]
  /** allergen ids whose items are hidden */
  hidden: number[]
  onChange: (hidden: number[]) => void
  locale: TypedLocale
}

/**
 * "Hide items with": one toggle chip per allergen on the menu (sdq `filter-allergens.tsx`);
 * picked chips are `aria-pressed`. Nothing shown when the menu has no allergens.
 */
export const FilterAllergens: React.FC<FilterAllergensProps> = (props) => {
  // 1. allergens empty → null
  // 2. <fieldset><legend>t.hideItemsWith</legend> a button per allergen, aria-pressed when in
  //    hidden; click toggles its id in hidden → onChange
  void props
  return null
}
