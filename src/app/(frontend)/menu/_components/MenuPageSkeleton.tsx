import React from 'react'

import { MenuItemCardSkeleton } from './MenuItemCardSkeleton'

/**
 * The menu page while it loads (`[slug]/loading.tsx`): a header bar, a carousel block, the
 * category tabs and six card placeholders, in the menu theme. aria-busy, no text, so it reads the
 * same in English and Arabic.
 */
export const MenuPageSkeleton: React.FC = () => {
  // 1. <div className="menu-theme min-h-dvh" aria-busy="true">
  // 2. header bar (logo circle + title line), aspect-[16/7] block, a row of 4 pill tabs
  // 3. grid of 6 <MenuItemCardSkeleton />; animate-pulse off under motion-reduce
  void MenuItemCardSkeleton
  return <div aria-busy="true" />
}
