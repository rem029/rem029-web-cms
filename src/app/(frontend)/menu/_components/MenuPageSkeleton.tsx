import React from 'react'

import { MenuItemCardSkeleton } from './MenuItemCardSkeleton'

const CARDS = 6
const TABS = 4

/**
 * The menu page while it loads (`[slug]/loading.tsx`): a header bar, a carousel block, the
 * category tabs and six card placeholders, in the menu theme. aria-busy, no text, so it reads the
 * same in English and Arabic.
 */
export const MenuPageSkeleton: React.FC = () => (
  <div className="menu-theme flex min-h-dvh flex-col" aria-busy="true">
    <div className="border-b border-menu-border">
      <div className="container flex items-center gap-3 py-4" aria-hidden>
        <div className="size-10 rounded-full bg-menu-card" />
        <div className="h-5 w-40 rounded bg-menu-card" />
      </div>
    </div>
    <div className="animate-pulse motion-reduce:animate-none" aria-hidden>
      <div className="aspect-[16/7] max-h-80 w-full bg-menu-card" />
      <div className="container py-6">
        <div className="h-8 w-1/2 rounded bg-menu-card" />
        <div className="mt-6 flex gap-2">
          {Array.from({ length: TABS }, (_, index) => (
            <div key={index} className="h-8 w-20 rounded-full bg-menu-card" />
          ))}
        </div>
      </div>
    </div>
    <div className="container grid gap-3 pb-10 md:grid-cols-2">
      {Array.from({ length: CARDS }, (_, index) => (
        <MenuItemCardSkeleton key={index} />
      ))}
    </div>
  </div>
)
