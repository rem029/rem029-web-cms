'use client'

import { Search, SlidersHorizontal } from 'lucide-react'
import type { TypedLocale } from 'payload'
import React, { useCallback, useMemo } from 'react'

import type { Menu as MenuDoc } from '@/payload-types'

import { allergensOf, filterSections } from '../_data/filterItems'
import type { GuestMenuItem, MenuSection } from '../_data/menuData'
import { useActiveSection } from '../_hooks/useActiveSection'
import { useMenuUrl } from '../_hooks/useMenuUrl'
import { menuStrings } from '../_i18n'
import { MenuStoreProvider, useMenuStore, type MenuState } from '../_store/store'
import { CategoryNav, sectionId } from './CategoryNav'
import { FilterAllergens } from './FilterAllergens'
import { FilterAvailability } from './FilterAvailability'
import { ItemView } from './ItemView'
import { MenuItemCard } from './MenuItemCard'
import { ScrollToTop } from './ScrollToTop'
import { SearchOverlay } from './SearchOverlay'

export type MenuProps = {
  menuId: number
  sections: MenuSection[]
  currency: string
  locale: TypedLocale
  filters: MenuDoc['filters']
  /** what the url asks for (`parseMenuUrl` on the server), so a shared link renders as sent */
  initial?: Partial<MenuState>
}

/**
 * The interactive part of `/menu/<slug>` (rem0017 phase 3 step 3, sdq `fnb-menu.tsx`): sticky
 * category nav with search and filter buttons, the sections with their item cards, the item view
 * and the search overlay. The whole menu comes from the server page (no fetching here except
 * search); the state lives in a zustand store (one per menu, `MenuStoreProvider`), mirrored in the
 * url by `useMenuUrl`, so `?item=`, `?category=`, `?allergens=` and `?period=` links are
 * shareable.
 */
export const Menu: React.FC<MenuProps> = ({ initial, ...props }) => (
  <MenuStoreProvider initial={initial}>
    <MenuBody {...props} />
  </MenuStoreProvider>
)

const barButtonClass =
  'flex shrink-0 items-center gap-1.5 rounded-full border border-menu-border px-3 py-1.5 text-sm font-medium text-menu-text hover:bg-menu-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-menu-primary aria-expanded:border-menu-primary'

// inside the provider, so it can use the store
const MenuBody: React.FC<Omit<MenuProps, 'initial'>> = ({
  menuId,
  sections,
  currency,
  locale,
  filters,
}) => {
  const t = menuStrings(locale)
  const allergens = useMenuStore((state) => state.allergens)
  const period = useMenuStore((state) => state.period)
  const itemSlug = useMenuStore((state) => state.itemSlug)
  const searchOpen = useMenuStore((state) => state.searchOpen)
  const filtersOpen = useMenuStore((state) => state.filtersOpen)
  const openItem = useMenuStore((state) => state.openItem)
  const setSearchOpen = useMenuStore((state) => state.setSearchOpen)
  const setFiltersOpen = useMenuStore((state) => state.setFiltersOpen)

  const shown = useMemo(
    () => filterSections(sections, { allergens, period }),
    [sections, allergens, period],
  )
  const menuAllergens = useMemo(() => allergensOf(sections), [sections])
  useActiveSection(shown.map(sectionId))
  useMenuUrl()

  // from the whole menu, not the filtered one: a shared link opens its item whatever the filters
  const openedItem = itemSlug
    ? sections.flatMap((section) => section.items).find((item) => item.slug === itemSlug)
    : undefined

  // stable, so the item view's dialog isn't closed and reopened on every render
  const closeItem = useCallback(() => openItem(null), [openItem])
  const closeSearch = useCallback(() => setSearchOpen(false), [setSearchOpen])
  const showItem = useCallback((item: GuestMenuItem) => openItem(item.slug), [openItem])

  const showSearch = filters?.showSearch !== false
  const showAllergens = filters?.showAllergens === true && menuAllergens.length > 0
  const showAvailability = filters?.showAvailability === true

  return (
    <div className="mt-6">
      <div className="sticky top-0 z-20 -mx-4 border-b border-menu-border bg-menu-bg px-4">
        <div className="flex items-center gap-2">
          <CategoryNav sections={shown} locale={locale} />
          {showSearch && (
            <button
              type="button"
              aria-label={t.search}
              onClick={() => setSearchOpen(true)}
              className={barButtonClass}
            >
              <Search className="size-4" aria-hidden />
            </button>
          )}
          {(showAllergens || showAvailability) && (
            <button
              type="button"
              aria-expanded={filtersOpen}
              aria-controls="menu-filters"
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={barButtonClass}
            >
              <SlidersHorizontal className="size-4" aria-hidden />
              {t.filters}
            </button>
          )}
        </div>
        {filtersOpen && (
          <div id="menu-filters" className="flex flex-col gap-4 py-3">
            {showAvailability && <FilterAvailability locale={locale} />}
            {showAllergens && <FilterAllergens allergens={menuAllergens} locale={locale} />}
          </div>
        )}
      </div>

      {shown.length === 0 && <p className="py-10 text-center text-menu-muted">{t.noResults}</p>}
      {shown.map((section) => {
        const id = sectionId(section)
        return (
          <section key={id} id={id} aria-labelledby={`${id}-title`} className="scroll-mt-20 pt-6">
            <h2 id={`${id}-title`} className="mb-3 text-xl font-semibold">
              {section.category?.title ?? t.other}
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {section.items.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  currency={currency}
                  locale={locale}
                  onOpen={showItem}
                />
              ))}
            </div>
          </section>
        )
      })}

      {openedItem && (
        <ItemView item={openedItem} currency={currency} locale={locale} onClose={closeItem} />
      )}
      {searchOpen && (
        <SearchOverlay
          menuId={menuId}
          currency={currency}
          locale={locale}
          onOpenItem={showItem}
          onClose={closeSearch}
        />
      )}
      <ScrollToTop locale={locale} />
    </div>
  )
}
