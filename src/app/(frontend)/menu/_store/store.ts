'use client'

import { createContext, createElement, useContext, useState, type ReactNode } from 'react'
import { createStore, useStore, type StoreApi } from 'zustand'

import type { Period } from '../_data/filterItems'

/**
 * The guest menu's state (rem0017 phase 3 step 3, sdq `_store/store.ts` slimmed to what a
 * whole-menu page needs): the filters, the category the guest is reading, the open item, and
 * whether search and the filter panel are open. One store per rendered menu through a context
 * provider (zustand's Next.js pattern): a module-level store would be shared by every request on
 * the server and keep one menu's filters when the guest opens another. `useMenuUrl` keeps the
 * shareable part in the url.
 */

export type MenuState = {
  /** allergen ids: only items containing one of them are shown; empty = no filter */
  allergens: number[]
  period: Period
  /** the section the guest is reading, `category-<slug>` (CategoryNav's `sectionId`) */
  category: string | null
  /** the item open in the item view, by slug */
  itemSlug: string | null
  searchOpen: boolean
  filtersOpen: boolean
}

export type MenuActions = {
  setAllergens: (allergens: number[]) => void
  setPeriod: (period: Period) => void
  setCategory: (category: string | null) => void
  openItem: (itemSlug: string | null) => void
  setSearchOpen: (open: boolean) => void
  setFiltersOpen: (open: boolean) => void
}

export type MenuStore = MenuState & MenuActions

export const INITIAL_MENU_STATE: MenuState = {
  allergens: [],
  period: 'all',
  category: null,
  itemSlug: null,
  searchOpen: false,
  filtersOpen: false,
}

export const createMenuStore = (initial: Partial<MenuState> = {}): StoreApi<MenuStore> =>
  createStore<MenuStore>((set) => ({
    ...INITIAL_MENU_STATE,
    ...initial,
    setAllergens: (allergens) => set({ allergens }),
    setPeriod: (period) => set({ period }),
    setCategory: (category) => set({ category }),
    openItem: (itemSlug) => set({ itemSlug }),
    setSearchOpen: (searchOpen) => set({ searchOpen }),
    setFiltersOpen: (filtersOpen) => set({ filtersOpen }),
  }))

const MenuStoreContext = createContext<StoreApi<MenuStore> | null>(null)

/** Wraps one menu; `initial` comes from the url (`parseMenuUrl`) so a shared link opens as sent. */
export const MenuStoreProvider = ({
  initial,
  children,
}: {
  initial?: Partial<MenuState>
  children: ReactNode
}) => {
  // the store is created once per mount, never again on re-render
  const [store] = useState(() => createMenuStore(initial))
  return createElement(MenuStoreContext.Provider, { value: store }, children)
}

export const useMenuStore = <T>(selector: (state: MenuStore) => T): T => {
  const store = useContext(MenuStoreContext)
  if (!store) throw new Error('useMenuStore outside MenuStoreProvider')
  return useStore(store, selector)
}
