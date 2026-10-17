'use client'

/**
 * Items panel of the menu builder: every item of the menu's tenant in one table, the ones on the
 * menu first and in menu order. Tick, photo, title, category, price (edit in place), in stock,
 * edit. Stateless: `MenuBuilder` owns the data and saves.
 */
import React from 'react'

import type { BuilderCategory, BuilderItem, QuickItemUpdate } from './builderTypes'

export type ItemsPanelProps = {
  items: BuilderItem[]
  picked: number[]
  categories: BuilderCategory[]
  currency: string
  locale: string
  search: string
  categoryFilter: number | null
  /** item id → 'Saved' or the error of its last quick edit */
  rowStatus: Record<number, { saved: true } | { error: string }>
  onSearch: (search: string) => void
  onCategoryFilter: (categoryId: number | null) => void
  onToggle: (itemId: number) => void
  onMove: (itemId: number, direction: -1 | 1) => void
  onQuickUpdate: (itemId: number, data: QuickItemUpdate) => void
  onEdit: (itemId: number | 'new') => void
}

export const ItemsPanel: React.FC<ItemsPanelProps> = (_props) => {
  // 1. toolbar: search box, category select ('All categories', each, 'No category'),
  //    'New item' button → onEdit('new')
  // 2. no items at all → empty state 'Add your first item' + the same 'New item' button
  // 3. rows: picked first (in picked order, with up/down buttons → onMove), then the rest by title
  // 4. each row: checkbox (label 'On this menu: <title>') → onToggle; photo; title; category;
  //    price input (number, step 0.01, shown with formatPrice) saved on blur when changed →
  //    onQuickUpdate({ price }); in-stock toggle → onQuickUpdate({ inStock }); 'Edit' → onEdit(id)
  // 5. rowStatus: 'Saved' or the error text next to the row (role="status" / role="alert")
  // 6. inactive items ("Show on menus" off) greyed with 'Hidden from menus'
  return <div className="menu-builder__items" />
}
