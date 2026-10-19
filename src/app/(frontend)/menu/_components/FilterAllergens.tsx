'use client'

import type { TypedLocale } from 'payload'
import React from 'react'

import { cn } from '@/utilities/ui'

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
    <fieldset className="menu-filter-group">
      <legend className="menu-filter-label mb-2 text-sm font-semibold">{t.withAllergens}</legend>
      <div className="flex flex-wrap gap-2">
        {allergens.map((allergen) => {
          const isPicked = picked.includes(allergen.id)
          return (
            <button
              key={allergen.id}
              type="button"
              aria-pressed={isPicked}
              onClick={() => toggle(allergen.id)}
              className={cn('menu-filter-chip', isPicked && 'is-active', chipClass)}
            >
              {allergen.title}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
