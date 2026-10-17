import React from 'react'

/** A grey card the size of a MenuItemCard (sdq `menu-card-skeleton.tsx`): while loading. */
export const MenuItemCardSkeleton: React.FC = () => (
  <div
    aria-hidden
    className="flex gap-3 rounded border border-menu-border bg-menu-card p-3 animate-pulse motion-reduce:animate-none"
  >
    <div className="flex flex-1 flex-col gap-2">
      <div className="h-4 w-2/3 rounded bg-menu-border" />
      <div className="h-3 w-full rounded bg-menu-border" />
      <div className="mt-auto h-4 w-16 rounded bg-menu-border" />
    </div>
    <div className="size-24 shrink-0 rounded bg-menu-border sm:size-28" />
  </div>
)
