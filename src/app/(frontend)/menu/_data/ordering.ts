import type { OrderTable } from '@/common/utils/orderTables'
import {
  isOpenAt,
  nextOpening,
  type OpeningHours,
  type Weekday,
} from '@/common/utils/restaurantHours'

/**
 * What the guest menu needs to take orders (rem0018 phase 3 step 2a), built by the menu page on
 * the server and passed to the client components. `null` on a menu with ordering off: the page
 * stays browse-only as rem0017 ships it.
 */
export type OpenStatus = {
  open: boolean
  /** when closed: the next opening, else `null` (every day closed) */
  next: { weekday: Weekday; opens: string } | null
}

export type MenuOrdering = {
  tenantId: number
  menuSlug: string
  showPrices: boolean
  /** the table from the QR code (`?table=`), checked on the server */
  table: OrderTable | null
  /** `?table=` named a table that isn't on this menu: the picker opens with a notice */
  tableRefused: boolean
  /** "Take orders only while open" (Settings → Restaurant) */
  ordersOnlyWhenOpen: boolean
  open: OpenStatus
}

/**
 * Open now, or closed with the next opening, from the Restaurant settings. Pure: the page passes
 * `new Date()`. No opening hours = always open (`isOpenAt`).
 */
export const openStatus = (hours: OpeningHours[], timezone: string, now: Date): OpenStatus => {
  const open = isOpenAt(hours, timezone, now)
  const next = open ? null : nextOpening(hours, timezone, now)
  return { open, next }
}
