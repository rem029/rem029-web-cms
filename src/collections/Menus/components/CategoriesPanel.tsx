'use client'

/**
 * Categories panel of the menu builder: the tenant's categories in guest order with their item
 * counts; add, rename, move up/down, and "Add all to this menu". Stateless: `MenuBuilder` saves.
 */
import React from 'react'

import type { BuilderCategory } from './builderTypes'

export type CategoriesPanelProps = {
  categories: BuilderCategory[]
  error: string | null
  onAddAll: (categoryId: number) => void
  onCreate: (title: string) => void
  onRename: (categoryId: number, title: string) => void
  onMove: (categoryId: number, direction: -1 | 1) => void
}

export const CategoriesPanel: React.FC<CategoriesPanelProps> = (_props) => {
  // 1. none yet → 'No categories yet. Items without one show under "Other".' + add form
  // 2. each row: title (click → inline rename input, Enter saves, Escape cancels), item count,
  //    up/down buttons (first/last disabled) → onMove, 'Add all to this menu' → onAddAll
  // 3. add form at the bottom: title input + 'Add category' → onCreate (empty title disabled)
  // 4. error → role="alert" above the list
  return <div className="menu-builder__categories" />
}
