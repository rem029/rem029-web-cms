'use client'

import type { RowLabelProps } from '@payloadcms/ui'
import React from 'react'

// option groups show their name ("Size") instead of "Option group 01"
export const OptionGroupRowLabel: React.FC<RowLabelProps> = () => {
  // 1. { data, rowNumber } = useRowLabel<NonNullable<MenuItem['modifierGroups']>[number]>()
  // 2. data.name → `${name} (n choices)`, else `Option group ${rowNumber + 1}`
  return null
}
