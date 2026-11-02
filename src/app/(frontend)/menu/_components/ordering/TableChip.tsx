'use client'

import type { TypedLocale } from 'payload'
import React from 'react'

import type { OrderTable } from '@/common/utils/orderTables'

import { menuStrings } from '../../_i18n'
import { touchTarget } from '../chip'

export type TableChipProps = {
  table: OrderTable | null
  locale: TypedLocale
  /** opens the table picker */
  onChange: () => void
}

/**
 * The picked table in the menu's toolbar (rem0018 phase 3 step 2a): "Table 5 · Change", or
 * "Pick your table" before one is picked. One button (44px target), class `menu-table-chip`.
 */
export const TableChip: React.FC<TableChipProps> = ({ table, locale, onChange }) => {
  const t = menuStrings(locale)
  const text = table ? `${t.table} ${table.label} · ${t.change}` : t.pickTable

  return (
    <button
      type="button"
      onClick={onChange}
      className={`menu-btn menu-table-chip ${touchTarget} inline-flex items-center rounded-full border border-menu-border px-3 py-1.5 text-sm font-medium text-menu-text hover:bg-menu-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-menu-primary`}
    >
      {text}
    </button>
  )
}
