'use client'

import { useRowLabel, type RowLabelProps } from '@payloadcms/ui'
import React from 'react'

import type { MenuItem } from '@/payload-types'

type OptionGroup = NonNullable<MenuItem['modifierGroups']>[number]

// option groups show their name ("Size · 2 choices") instead of "Option group 01"
export const OptionGroupRowLabel: React.FC<RowLabelProps> = () => {
  const { data, rowNumber } = useRowLabel<OptionGroup>()
  const choices = data?.options?.length ?? 0
  if (!data?.name) return <span>Option group {(rowNumber ?? 0) + 1}</span>
  return (
    <span>
      {data.name} · {choices} {choices === 1 ? 'choice' : 'choices'}
    </span>
  )
}
