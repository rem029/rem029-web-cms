'use client'

import type { TypedLocale } from 'payload'
import React from 'react'

import type { Period } from '../_data/filterItems'

export type FilterAvailabilityProps = {
  period: Period
  onChange: (period: Period) => void
  locale: TypedLocale
}

const PERIODS: Period[] = ['all', 'breakfast', 'lunch', 'dinner']

/** All / Breakfast / Lunch / Dinner (sdq `filter-availability.tsx`): one picked at a time. */
export const FilterAvailability: React.FC<FilterAvailabilityProps> = (props) => {
  // 1. <fieldset><legend>t.availability</legend> a button per PERIODS entry, label t[period],
  //    aria-pressed when it's the period, click → onChange(period)
  void props
  void PERIODS
  return null
}
