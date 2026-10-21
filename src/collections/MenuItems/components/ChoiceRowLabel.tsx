'use client'

import { useRowLabel, type RowLabelProps } from '@payloadcms/ui'
import React from 'react'

import type { MenuItem } from '@/payload-types'

type Choice = NonNullable<NonNullable<MenuItem['modifierGroups']>[number]['options']>[number]

// choices show their name and extra price ("Large · +2") instead of "Choice 01"
export const ChoiceRowLabel: React.FC<RowLabelProps> = () => {
  const { data, rowNumber } = useRowLabel<Choice>()
  if (!data?.label) return <span>Choice {(rowNumber ?? 0) + 1}</span>
  if (!data.price) return <span>{data.label}</span>
  return (
    <span>
      {data.label} · +{data.price}
    </span>
  )
}
