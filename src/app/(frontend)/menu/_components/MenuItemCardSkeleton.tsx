import React from 'react'

/** A grey card the size of a MenuItemCard (sdq `menu-card-skeleton.tsx`): search results loading. */
export const MenuItemCardSkeleton: React.FC = () => {
  // 1. aria-hidden box: image block + two text lines, animate-pulse (motion-reduce:animate-none),
  //    bg-menu-card / bg-menu-border
  return <div aria-hidden />
}
