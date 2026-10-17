'use client'

import type { TypedLocale } from 'payload'
import React from 'react'

import type { Period } from '../_data/filterItems'
import { menuStrings } from '../_i18n'
import { useMenuStore } from '../_store/store'
import { chipClass } from './chip'

const PERIODS: Period[] = ['all', 'breakfast', 'lunch', 'dinner']

/**
 * All / Breakfast / Lunch / Dinner (sdq `filter-availability.tsx`): one picked at a time,
 * `aria-pressed`. Reads and writes the store's `period`.
 */
export const FilterAvailability: React.FC<{ locale: TypedLocale }> = ({ locale }) => {
  const t = menuStrings(locale)
  const period = useMenuStore((state) => state.period)
  const setPeriod = useMenuStore((state) => state.setPeriod)

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">{t.availability}</legend>
      <div className="flex flex-wrap gap-2">
        {PERIODS.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={value === period}
            onClick={() => setPeriod(value)}
            className={chipClass}
          >
            {t[value]}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
