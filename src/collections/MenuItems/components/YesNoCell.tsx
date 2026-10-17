'use client'

import type { DefaultCellComponentProps } from 'payload'
import React from 'react'

// "In stock" and "Show on menus" in the items list: a short badge instead of true / false
export const YesNoCell: React.FC<DefaultCellComponentProps> = (_props) => {
  // 1. cellData === true → 'Yes' badge (theme-success colours, like HomepageCell)
  // 2. else → 'No' badge (theme-elevation colours), so an unticked item stands out
  return null
}
