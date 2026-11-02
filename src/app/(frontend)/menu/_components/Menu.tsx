'use client'

import { Search, SlidersHorizontal } from 'lucide-react'
import type { TypedLocale } from 'payload'
import React, { useCallback, useMemo, useState } from 'react'

import type { OrderTable } from '@/common/utils/orderTables'
import type { Menu as MenuDoc } from '@/payload-types'
import { cn } from '@/utilities/ui'

import { allergensOf, filterSections } from '../_data/filterItems'
import type { GuestMenuItem, MenuSection } from '../_data/menuData'
import type { MenuOrdering } from '../_data/ordering'
import { useActiveSection } from '../_hooks/useActiveSection'
import { useMenuUrl } from '../_hooks/useMenuUrl'
import { menuStrings } from '../_i18n'
import { CartStoreProvider, useCartStore } from '../_store/cart'
import { MenuStoreProvider, useMenuStore, type MenuState } from '../_store/store'
import { CategoryNav, sectionId } from './CategoryNav'
import { touchTarget } from './chip'
import { FilterAllergens } from './FilterAllergens'
import { FilterAvailability } from './FilterAvailability'
import { ItemView } from './ItemView'
import { MenuItemCard } from './MenuItemCard'
import { CartBar, type PlacedOrder } from './ordering/CartBar'
import { TableChip } from './ordering/TableChip'
import { TablePicker } from './ordering/TablePicker'
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
  /** rem0018 phase 3 step 2a: set when the menu takes orders, else the menu is browse only */
  ordering?: MenuOrdering | null
}

/**
 * The interactive part of `/menu/<slug>` (rem0017 phase 3 step 3, sdq `fnb-menu.tsx`): sticky
 * category nav with search and filter buttons, the sections with their item cards, the item view
 * and the search overlay. The whole menu comes from the server page (no fetching here except
 * search); the state lives in a zustand store (one per menu, `MenuStoreProvider`), mirrored in the
 * url by `useMenuUrl`, so `?item=`, `?category=`, `?allergens=` and `?period=` links are
 * shareable.
 */
export const Menu: React.FC<MenuProps> = ({ initial, ordering, ...props }) => (
  <MenuStoreProvider initial={initial}>
    {ordering ? (
      <CartStoreProvider
        tenantId={ordering.tenantId}
        menuSlug={ordering.menuSlug}
        available={cartItems(props.sections)}
      >
        <MenuBody {...props} ordering={ordering} />
      </CartStoreProvider>
    ) : (
      <MenuBody {...props} ordering={null} />
    )}
  </MenuStoreProvider>
)

// the items a cart line may hold: in stock, with their choice ids (rem0018 phase 3 step 2a)
const cartItems = (sections: MenuSection[]) =>
  sections
    .flatMap((section) => section.items)
    .filter((item) => item.inStock)
    .map((item) => ({
      itemId: item.id,
      optionIds: item.modifierGroups.flatMap((group) => group.options.map((option) => option.id)),
    }))

// the item view of an ordering menu: Add to cart puts the line in the cart (needs the cart's
// provider, so it's its own component)
const OrderingItemView: React.FC<{
  item: GuestMenuItem
  currency: string
  locale: TypedLocale
  showPrices: boolean
  onClose: () => void
}> = ({ showPrices, ...props }) => {
  const addLine = useCartStore((state) => state.addLine)
  return <ItemView {...props} ordering={{ showPrices, onAdd: addLine }} />
}

// keeps the cart's table in step with the one on screen (the QR code's or the picked one)
const CartTable: React.FC<{ table: OrderTable | null }> = ({ table }) => {
  const setTable = useCartStore((state) => state.setTable)
  const slug = table?.slug ?? null
  React.useEffect(() => setTable(slug), [setTable, slug])
  return null
}

const barButtonClass = cn(
  touchTarget,
  '[@media(pointer:coarse)]:min-w-11 justify-center',
  'flex shrink-0 items-center gap-1.5 rounded-full border border-menu-border px-3 py-1.5 text-sm font-medium text-menu-text hover:bg-menu-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-menu-primary aria-expanded:border-menu-primary',
)

// inside the provider, so it can use the store
const MenuBody: React.FC<
  Omit<MenuProps, 'initial' | 'ordering'> & { ordering: MenuOrdering | null }
> = ({ menuId, sections, currency, locale, filters, ordering }) => {
  const t = menuStrings(locale)
  // ordering (rem0018 phase 3 step 2a): the table on screen, the picker, the last placed order
  const [table, setTable] = useState<OrderTable | null>(ordering?.table ?? null)
  const [pickerOpen, setPickerOpen] = useState(ordering?.tableRefused === true)
  const [placed, setPlaced] = useState<PlacedOrder | null>(null)
  const closePicker = useCallback(() => setPickerOpen(false), [])
  const showPrices = ordering?.showPrices !== false
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
    // room for the cart bar fixed at the bottom (walkthrough 2026-11-02)
    <div className={cn('mt-6', ordering && 'pb-28')}>
      <div className="menu-toolbar sticky top-0 z-20 -mx-4 border-b border-menu-border bg-menu-bg px-4">
        <div className="flex items-center gap-2">
          <CategoryNav sections={shown} locale={locale} />
          {ordering && (
            <TableChip table={table} locale={locale} onChange={() => setPickerOpen(true)} />
          )}
          {showSearch && (
            <button
              type="button"
              aria-label={t.search}
              onClick={() => setSearchOpen(true)}
              className={cn('menu-btn menu-search-btn', barButtonClass)}
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
              className={cn('menu-btn menu-filter-btn', barButtonClass)}
            >
              <SlidersHorizontal className="size-4" aria-hidden />
              {t.filters}
            </button>
          )}
        </div>
        {filtersOpen && (
          <div id="menu-filters" className="menu-filters flex flex-col gap-4 py-3">
            {showAvailability && <FilterAvailability locale={locale} />}
            {showAllergens && <FilterAllergens allergens={menuAllergens} locale={locale} />}
          </div>
        )}
      </div>

      {shown.length === 0 && <p className="py-10 text-center text-menu-muted">{t.noResults}</p>}
      {shown.map((section) => {
        const id = sectionId(section)
        return (
          <section
            key={id}
            id={id}
            aria-labelledby={`${id}-title`}
            className="menu-section scroll-mt-20 pt-6"
          >
            <h2 id={`${id}-title`} className="menu-section-title mb-3 text-xl font-semibold">
              {section.category?.title ?? t.other}
            </h2>
            <div className="menu-items grid gap-3 md:grid-cols-2">
              {section.items.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  currency={currency}
                  locale={locale}
                  onOpen={showItem}
                  showPrices={showPrices}
                />
              ))}
            </div>
          </section>
        )
      })}

      {openedItem && ordering && (
        <OrderingItemView
          item={openedItem}
          currency={currency}
          locale={locale}
          showPrices={showPrices}
          onClose={closeItem}
        />
      )}
      {openedItem && !ordering && (
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
      {ordering && (
        <>
          <CartTable table={table} />
          {pickerOpen && (
            <TablePicker
              menuSlug={ordering.menuSlug}
              locale={locale}
              current={table}
              refused={ordering.tableRefused && table === null}
              onPick={setTable}
              onClose={closePicker}
            />
          )}
          {placed && (
            <p
              role="status"
              className="menu-order-placed fixed inset-x-4 bottom-4 z-30 mx-auto max-w-lg rounded border border-menu-border bg-menu-card p-4 text-center font-medium shadow-lg"
            >
              {t.orderPlaced.replace('{number}', String(placed.orderNumber))}
            </p>
          )}
          <CartBar
            items={sections.flatMap((section) => section.items)}
            currency={currency}
            locale={locale}
            ordering={ordering}
            onPickTable={() => setPickerOpen(true)}
            onPlaced={setPlaced}
          />
        </>
      )}
    </div>
  )
}
