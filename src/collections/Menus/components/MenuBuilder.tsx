'use client'

/**
 * The menu builder (rem0017 phase 2 step 2): the Items tab of a menu (a `ui` field in
 * `../index.ts`). The items panel ticks what the menu shows (the form's `items` field, saved
 * with the menu, so drafts and live preview work as usual); quick edits and new items/categories
 * save to the catalog right away through `./actions.ts`. Works before the first save: the tenant
 * comes from the form's `tenant` field.
 */
import { useField, useLocale } from '@payloadcms/ui'
import React from 'react'

import { CategoriesPanel } from './CategoriesPanel'
import { ItemFormModal } from './ItemFormModal'
import { ItemsPanel } from './ItemsPanel'

export const MenuBuilder: React.FC = () => {
  const { value: _items, setValue: _setItems } = useField<number[]>({ path: 'items' })
  const { value: _tenant } = useField<number | null>({ path: 'tenant' })
  const _locale = useLocale()

  // state: rows (BuilderItem[]), currency, categories, search, categoryFilter, editing
  //   (null | 'new' | itemId), error
  // 1. no tenant yet → 'Pick a business first.' (the tenant selector sets it)
  // 2. load rows with listBuilderItemsAction({ tenantId, locale, search, categoryId }) on
  //    tenant/locale/search/filter change; categories with listBuilderCategoriesAction
  // 3. picked = items as ids (narrow populated docs to their id)
  // 4. toggle(id): picked has id → setItems(without id), else setItems([...picked, id])
  // 5. move(id, -1 | 1): swap with its neighbour in picked → setItems
  // 6. addAll(categoryId): listItemsOfCategoryAction → setItems(picked + the ids not on it yet)
  // 7. quickUpdate(id, patch): quickUpdateItemAction → replace the row, 'Saved'; on
  //    { ok: false } show the error and keep the old row
  // 8. saved from the modal: new item → add the row and tick it; edit → replace the row
  // 9. render <ItemsPanel …/>, <CategoriesPanel …/>, <ItemFormModal …/> when editing
  void ItemsPanel
  void CategoriesPanel
  void ItemFormModal
  return <div className="menu-builder" />
}
