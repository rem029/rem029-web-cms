'use client'

import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { createStore, useStore, type Mutate, type StoreApi } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { safeStorage } from '@/common/utils/safeStorage'

import type { CartLine as PlacedLine } from '../_data/guestOrders'
import { MAX_QUANTITY } from '../_data/orderLimits'

/**
 * The guest's cart (rem0018 phase 3 step 2a, plan "browser storage"): one per tenant and menu,
 * kept in localStorage under `orders-cart:<tenantId>:<menuSlug>` (zustand `persist`), so a reload
 * or a second QR scan keeps it. Holds ids and quantities only, never prices: the screens price
 * the lines from the menu data (`lineBreakdown`), the server from the catalog. Storage that is
 * empty, blocked or throws (private mode) leaves an empty cart, never a crash. One store per
 * mounted menu through a context provider, as `store.ts`.
 */

/** A cart line: what `placeOrder` takes, plus a key (item + its sorted choice ids). */
export type CartLine = PlacedLine & { key: string }

export type CartState = {
  lines: CartLine[]
  guestName: string
  notes: string
  /** the picked table's slug (the QR code's, or the picker's) */
  tableSlug: string | null
}

export type CartActions = {
  /** adds the line, or adds to the quantity of the same item with the same choices */
  addLine: (line: PlacedLine) => void
  /** 0 removes the line; capped at `MAX_QUANTITY` */
  setQuantity: (key: string, quantity: number) => void
  setGuestName: (guestName: string) => void
  setNotes: (notes: string) => void
  setTable: (tableSlug: string | null) => void
  /** after the order is placed: lines, name and notes go, the table stays */
  clear: () => void
  /** drops lines whose item (or a chosen choice) is no longer on the menu */
  keepItems: (available: { itemId: number; optionIds: string[] }[]) => void
}

export type CartStore = CartState & CartActions

/** the store with zustand's `persist` api (`persist.rehydrate()` on a reload) */
export type CartStoreApi = Mutate<StoreApi<CartStore>, [['zustand/persist', CartState]]>

/** `orders-cart:<tenantId>:<menuSlug>` */
export const cartStorageKey = (tenantId: number, menuSlug: string): string =>
  `orders-cart:${tenantId}:${menuSlug}`

/**
 * A cart store persisted under `cartStorageKey` (`createJSONStorage` over `safeStorage`).
 */
export const createCartStore = (tenantId: number, menuSlug: string): CartStoreApi =>
  createStore<CartStore, [['zustand/persist', CartState]]>(
    persist(
      (set) => ({
        lines: [],
        guestName: '',
        notes: '',
        tableSlug: null,
        addLine: (line) =>
          set((state) => {
            const key = `${line.itemId}:${[...line.optionIds].sort().join(',')}`
            const existing = state.lines.find((l) => l.key === key)
            if (existing) {
              const quantity = Math.min(existing.quantity + line.quantity, MAX_QUANTITY)
              return {
                lines: state.lines.map((l) => (l.key === key ? { ...l, quantity } : l)),
              }
            }
            const quantity = Math.min(line.quantity, MAX_QUANTITY)
            return {
              lines: [...state.lines, { ...line, key, quantity }],
            }
          }),
        setQuantity: (key, quantity) =>
          set((state) => {
            if (quantity <= 0) {
              return { lines: state.lines.filter((l) => l.key !== key) }
            }
            const capped = Math.min(quantity, MAX_QUANTITY)
            return {
              lines: state.lines.map((l) => (l.key === key ? { ...l, quantity: capped } : l)),
            }
          }),
        setGuestName: (guestName) => set({ guestName }),
        setNotes: (notes) => set({ notes }),
        setTable: (tableSlug) => set({ tableSlug }),
        clear: () => set({ lines: [], guestName: '', notes: '' }),
        keepItems: (available) =>
          set((state) => ({
            lines: state.lines.filter((line) => {
              const item = available.find((a) => a.itemId === line.itemId)
              if (!item) return false
              return line.optionIds.every((id) => item.optionIds.includes(id))
            }),
          })),
      }),
      {
        name: cartStorageKey(tenantId, menuSlug),
        // the server renders an empty cart: the provider loads storage after mount, so the first
        // client render matches it (no hydration mismatch)
        skipHydration: true,
        storage: createJSONStorage(() => safeStorage),
        partialize: (state): CartState => ({
          lines: state.lines,
          guestName: state.guestName,
          notes: state.notes,
          tableSlug: state.tableSlug,
        }),
      },
    ),
  )

const CartStoreContext = createContext<CartStoreApi | null>(null)

/**
 * Wraps one ordering menu; the store is created once per mount (as `MenuStoreProvider`). After
 * mount it loads the saved cart, then drops lines no longer on the menu (`available`).
 */
export const CartStoreProvider = ({
  tenantId,
  menuSlug,
  available,
  children,
}: {
  tenantId: number
  menuSlug: string
  /** the menu's items with their choice ids; left out (tests): every saved line stays */
  available?: { itemId: number; optionIds: string[] }[]
  children: ReactNode
}) => {
  const [store] = useState(() => createCartStore(tenantId, menuSlug))
  useEffect(() => {
    void Promise.resolve(store.persist.rehydrate()).then(() => {
      if (available) store.getState().keepItems(available)
    })
    // once per mount: `available` is the menu the page rendered
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store])
  return createElement(CartStoreContext.Provider, { value: store }, children)
}

export const useCartStore = <T>(selector: (state: CartStore) => T): T => {
  const store = useContext(CartStoreContext)
  if (!store) throw new Error('useCartStore outside CartStoreProvider')
  return useStore(store, selector)
}
