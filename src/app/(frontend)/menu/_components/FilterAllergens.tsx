'use client'

import type { TypedLocale } from 'payload'
import React from 'react'

import { menuStrings } from '../_i18n'
import { useMenuStore } from '../_store/store'
import { chipClass } from './chip'

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
export const FilterAllergens: React.FC<FilterAllergensProps> = ({ allergens, locale }) => {
  const t = menuStrings(locale)
  const picked = useMenuStore((state) => state.allergens)
  const setAllergens = useMenuStore((state) => state.setAllergens)
  if (allergens.length === 0) return null

  const toggle = (id: number) =>
    setAllergens(picked.includes(id) ? picked.filter((value) => value !== id) : [...picked, id])

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">{t.withAllergens}</legend>
      <div className="flex flex-wrap gap-2">
        {allergens.map((allergen) => (
          <button
            key={allergen.id}
            type="button"
            aria-pressed={picked.includes(allergen.id)}
            onClick={() => toggle(allergen.id)}
            className={chipClass}
          >
            {allergen.title}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
