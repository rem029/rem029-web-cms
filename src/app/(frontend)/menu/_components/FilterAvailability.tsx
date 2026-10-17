'use client'

import type { TypedLocale } from 'payload'
import React from 'react'

import type { Period } from '../_data/filterItems'

const PERIODS: Period[] = ['all', 'breakfast', 'lunch', 'dinner']

/**
 * All / Breakfast / Lunch / Dinner (sdq `filter-availability.tsx`): one picked at a time,
 * `aria-pressed`. Reads and writes the store's `period`.
 */
export const FilterAvailability: React.FC<{ locale: TypedLocale }> = (props) => {
  // 1. period / setPeriod from useMenuStore
  // 2. <fieldset><legend>t.availability</legend> a button per PERIODS entry, label t[period],
  //    aria-pressed when it's the period, click → setPeriod(period)
  void props
  void PERIODS
  return null
}
