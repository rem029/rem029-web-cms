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

/**
 * The orders placed on this device (rem0018 phase 3 step 2b, plan "browser storage"): kept in
 * localStorage under `orders-mine:<tenantId>` with their guest tokens, so tracking resumes after a
 * reload, a closed tab or a second QR scan ("Your orders"). Only a shortcut: a cleared storage
 * loses it, staff still see the order. Pruned on load: an order finished (completed or
 * cancelled) more than a day ago, and anything placed more than 7 days ago. One store per
 * tenant (every menu of the business shows the same list), through a context provider as
 * `cart.ts`.
 */

export type MyOrder = {
  orderId: number
  orderNumber: number
  menuSlug: string
  /** the guest token `placeOrder` returned once: never sent anywhere but this guest's actions */
  token: string
  /** ISO time the order was placed */
  placedAt: string
  /** ISO time the tracker first saw it completed or cancelled, else `null` */
  finishedAt: string | null
}

export type MyOrdersState = { orders: MyOrder[] }

export type MyOrdersActions = {
  /** most recent first; the same order id again replaces its entry */
  add: (order: Omit<MyOrder, 'finishedAt'>) => void
  /** stamps `finishedAt` once (later calls keep the first time) */
  markFinished: (orderId: number, at: string) => void
  /** the guest dismissed it, or the server no longer knows it (404) */
  remove: (orderId: number) => void
  /** drops entries past the limits above, from `now` */
  prune: (now: Date) => void
}

export type MyOrdersStore = MyOrdersState & MyOrdersActions

export type MyOrdersStoreApi = Mutate<StoreApi<MyOrdersStore>, [['zustand/persist', MyOrdersState]]>

export const FINISHED_KEEP_MS = 24 * 60 * 60 * 1000
export const ANY_KEEP_MS = 7 * 24 * 60 * 60 * 1000

/** `orders-mine:<tenantId>` */
export const myOrdersStorageKey = (tenantId: number): string => `orders-mine:${tenantId}`

/** A store persisted under `myOrdersStorageKey`, loaded after mount (`skipHydration`, as the cart). */
export const createMyOrdersStore = (tenantId: number): MyOrdersStoreApi =>
  createStore<MyOrdersStore, [['zustand/persist', MyOrdersState]]>(
    persist(
      (set) => ({
        orders: [],
        // 1. add: drop any entry with the same orderId, put the new one first with finishedAt null
        add: (order) =>
          set((state) => ({
            orders: [
              { ...order, finishedAt: null },
              ...state.orders.filter((o) => o.orderId !== order.orderId),
            ],
          })),
        // 2. markFinished: set finishedAt on that order only when it is still null
        markFinished: (orderId, at) =>
          set((state) => ({
            orders: state.orders.map((o) =>
              o.orderId === orderId && o.finishedAt === null ? { ...o, finishedAt: at } : o,
            ),
          })),
        // 3. remove: filter the order out
        remove: (orderId) =>
          set((state) => ({
            orders: state.orders.filter((o) => o.orderId !== orderId),
          })),
        // 4. prune: keep an entry when now - placedAt <= ANY_KEEP_MS and (finishedAt is null or
        //    now - finishedAt <= FINISHED_KEEP_MS); unparseable dates are dropped
        prune: (now) =>
          set((state) => {
            const nowTime = now.getTime()
            return {
              orders: state.orders.filter((o) => {
                const placed = Date.parse(o.placedAt)
                if (Number.isNaN(placed)) return false
                if (nowTime - placed > ANY_KEEP_MS) return false
                if (o.finishedAt !== null) {
                  const finished = Date.parse(o.finishedAt)
                  if (Number.isNaN(finished)) return false
                  if (nowTime - finished > FINISHED_KEEP_MS) return false
                }
                return true
              }),
            }
          }),
      }),
      {
        name: myOrdersStorageKey(tenantId),
        skipHydration: true,
        storage: createJSONStorage(() => safeStorage),
        partialize: (state): MyOrdersState => ({ orders: state.orders }),
      },
    ),
  )

const MyOrdersContext = createContext<MyOrdersStoreApi | null>(null)

/** Wraps an ordering menu; after mount it loads the saved list, then prunes it. */
export const MyOrdersProvider = ({
  tenantId,
  children,
}: {
  tenantId: number
  children: ReactNode
}) => {
  const [store] = useState(() => createMyOrdersStore(tenantId))
  useEffect(() => {
    // 1. rehydrate, then prune(new Date())
    void Promise.resolve(store.persist.rehydrate()).then(() => {
      store.getState().prune(new Date())
    })
  }, [store])
  return createElement(MyOrdersContext.Provider, { value: store }, children)
}

export const useMyOrders = <T>(selector: (state: MyOrdersStore) => T): T => {
  const store = useContext(MyOrdersContext)
  if (!store) throw new Error('useMyOrders outside MyOrdersProvider')
  return useStore(store, selector)
}
