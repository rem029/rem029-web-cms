'use client'

import type { TypedLocale } from 'payload'
import React from 'react'

import type { MenuSection } from '../_data/menuData'

export type CategoryNavProps = {
  sections: MenuSection[]
  /** the section id the guest is reading (`category-<slug>`) */
  active: string | null
  onPick: (sectionId: string) => void
  locale: TypedLocale
}

/** `category-<slug>`, `category-other` for items without a category: the section element ids. */
export const sectionId = (section: MenuSection): string =>
  `category-${section.category?.slug ?? 'other'}`

/**
 * The menu's category tabs (sdq `filter-categories.tsx`): one button per section in a row that
 * scrolls sideways on phones (RTL: starts at the right), the active one marked
 * (`aria-current="true"`, primary colour) and kept in view.
 */
export const CategoryNav: React.FC<CategoryNavProps> = (props) => {
  // 1. <nav aria-label=t.categories> with a horizontal overflow-x-auto list
  // 2. a button per section: label category title ?? t.other, aria-current when active,
  //    onClick → onPick(sectionId(section))
  // 3. effect: active changes → the active button scrollIntoView({ inline: 'nearest',
  //    block: 'nearest' }) inside the row
  void props
  return <nav />
}
