'use client'

/**
 * The full item form of the menu builder, for a new item or an existing one: details, photo,
 * allergens, tags, availability, options. Loads the item with `getItemFormAction`, the allergen
 * and tag choices with `listLookupsAction`, and saves with `saveItemAction` (photo upload with
 * `uploadItemImageAction`). Opens in Payload's drawer so it looks like the rest of the admin.
 */
import React from 'react'

import type { BuilderCategory, BuilderItem } from './builderTypes'
import { ModifierGroupsEditor } from './ModifierGroupsEditor'

export type ItemFormModalProps = {
  tenantId: number
  locale: string
  /** 'new' for a new item */
  itemId: number | 'new'
  categories: BuilderCategory[]
  /** category picked in the items panel filter: preselected on a new item */
  defaultCategory: number | null
  onClose: () => void
  onSaved: (item: BuilderItem, created: boolean) => void
}

export const ItemFormModal: React.FC<ItemFormModalProps> = (_props) => {
  // 1. state: data (ItemFormData; new → empty, price 0, in stock, shown, all day, category =
  //    defaultCategory), lookups, saving, error
  // 2. existing → getItemFormAction; listLookupsAction once
  // 3. fields: title*, price*, category select, description, photo (preview + 'Upload photo' →
  //    uploadItemImageAction), allergens and tags as checkbox lists, served (availability
  //    checkboxes), in stock, show on menus, <ModifierGroupsEditor>
  // 4. save: saveItemAction → onSaved(item, itemId === 'new') + onClose; { ok: false } → error
  //    in role="alert", the form stays open with what was typed
  void ModifierGroupsEditor
  return <div className="menu-builder__item-form" />
}
