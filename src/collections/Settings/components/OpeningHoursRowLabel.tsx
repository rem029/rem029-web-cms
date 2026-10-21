'use client'

import { useRowLabel, type RowLabelProps } from '@payloadcms/ui'
import React from 'react'

import { WEEKDAY_LABELS, type OpeningHours, WEEKDAYS } from '@/common/utils/restaurantHours'

const isWeekday = (value: unknown): value is OpeningHours['weekday'] =>
  typeof value === 'string' && (WEEKDAYS as readonly string[]).includes(value)

// opening hours rows show their day and hours ("Saturday · 07:00–01:00") instead of "Day 01"
export const OpeningHoursRowLabel: React.FC<RowLabelProps> = () => {
  const { data, rowNumber } = useRowLabel<Partial<OpeningHours>>()
  if (!isWeekday(data?.weekday)) return <span>Day {(rowNumber ?? 0) + 1}</span>

  const day = WEEKDAY_LABELS[data.weekday]
  if (data.closed) return <span>{day} · Closed</span>
  if (!data.opens || !data.closes) return <span>{day}</span>
  return (
    <span>
      {day} · {data.opens}–{data.closes}
    </span>
  )
}
