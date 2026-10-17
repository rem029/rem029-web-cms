'use client'

import type { TypedLocale } from 'payload'
import React, { useEffect, useRef } from 'react'

import { cn } from '@/utilities/ui'

import type { MenuSection } from '../_data/menuData'
import { menuStrings } from '../_i18n'
import { useMenuStore } from '../_store/store'

export type CategoryNavProps = {
  sections: MenuSection[]
  locale: TypedLocale
}

/** `category-<slug>`, `category-other` for items without a category: the section element ids. */
export const sectionId = (section: MenuSection): string =>
  `category-${section.category?.slug ?? 'other'}`

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * The menu's category tabs (sdq `filter-categories.tsx`): one button per section in a row that
 * scrolls sideways on phones (RTL: starts at the right), the active one marked
 * (`aria-current="true"`, primary colour) and kept in view. The active one is the store's
 * `category` (the first section when none): set by a click (which also scrolls to the section)
 * and by `useActiveSection` while the guest scrolls.
 */
export const CategoryNav: React.FC<CategoryNavProps> = ({ sections, locale }) => {
  const t = menuStrings(locale)
  const category = useMenuStore((state) => state.category)
  const setCategory = useMenuStore((state) => state.setCategory)
  const listRef = useRef<HTMLUListElement>(null)
  const active = category ?? (sections[0] ? sectionId(sections[0]) : null)

  useEffect(() => {
    listRef.current
      ?.querySelector('[aria-current="true"]')
      ?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
  }, [active])

  const pick = (id: string) => {
    setCategory(id)
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
  }

  return (
    <nav aria-label={t.categories} className="min-w-0 flex-1">
      <ul ref={listRef} className="flex gap-2 overflow-x-auto py-2 [scrollbar-width:none]">
        {sections.map((section) => {
          const id = sectionId(section)
          return (
            <li key={id} className="shrink-0">
              <button
                type="button"
                aria-current={id === active ? 'true' : undefined}
                onClick={() => pick(id)}
                className={cn(
                  'rounded-full border border-menu-border px-3 py-1.5 text-sm font-medium text-menu-text',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-menu-primary',
                  'aria-[current=true]:border-menu-primary aria-[current=true]:bg-menu-primary aria-[current=true]:text-menu-primary-text',
                )}
              >
                {section.category?.title ?? t.other}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
