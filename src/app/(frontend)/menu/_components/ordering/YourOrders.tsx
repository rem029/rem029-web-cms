'use client'

import { X } from 'lucide-react'
import type { TypedLocale } from 'payload'
import React, { useEffect, useRef } from 'react'

import type { AlertSound } from '@/common/components/AlertSounds/useAlertSound'
import type { BrowserNotifications } from '@/common/components/AlertSounds/useBrowserNotifications'
import type { GuestOrder } from '@/common/utils/guestOrder'
import { cn } from '@/utilities/ui'

import { useOrderTracking } from '../../_hooks/useOrderTracking'
import { menuStrings, type MenuStrings } from '../../_i18n'
import { useMyOrders, type MyOrder } from '../../_store/myOrders'
import { OrderTracker } from './OrderTracker'

export type YourOrdersProps = {
  locale: TypedLocale
  onlinePayment: boolean
  /** the order whose tracker is open (just placed, tapped, or back from Pay now), else null */
  openOrderId: number | null
  onOpen: (orderId: number | null) => void
  sound: AlertSound
  notifications: BrowserNotifications
}

const STATUS_LABEL: Record<GuestOrder['status'], keyof MenuStrings> = {
  pending: 'statusPending',
  confirmed: 'statusConfirmed',
  preparing: 'statusPreparing',
  prepared: 'statusPrepared',
  served: 'statusServed',
  completed: 'statusCompleted',
  cancelled: 'statusCancelled',
}

const isFinished = (status: GuestOrder['status']) =>
  status === 'completed' || status === 'cancelled'

/**
 * "Your orders" (rem0018 phase 3 step 2b, plan "browser storage": tracking resumes from
 * storage): a strip above the menu with one chip per order in `useMyOrders` ("#12 · Preparing",
 * newest first), each tracked live by its own `YourOrder`. Tapping a chip opens its
 * `OrderTracker`. Nothing when the list is empty. Class `menu-your-orders`, chips
 * `menu-your-order`.
 */
export const YourOrders: React.FC<YourOrdersProps> = ({ openOrderId, ...props }) => {
  const t = menuStrings(props.locale)
  const orders = useMyOrders((state) => state.orders)
  if (orders.length === 0) return null
  return (
    <section aria-label={t.yourOrders} className="menu-your-orders flex flex-wrap gap-2 pt-4">
      {orders.map((saved) => (
        <YourOrder
          key={saved.orderId}
          {...props}
          saved={saved}
          open={saved.orderId === openOrderId}
        />
      ))}
    </section>
  )
}

/**
 * One saved order: `useOrderTracking` with its token; the chip ("#12 · Preparing", "Reconnecting…"
 * when the stream is down), the tracker when open, and the alerts (`useOrderAlerts`). Completed or
 * cancelled → `markFinished` (pruned a day later) and a **Remove** button; 404 → `remove`.
 */
export const YourOrder: React.FC<
  Omit<YourOrdersProps, 'openOrderId'> & { saved: MyOrder; open: boolean }
> = ({ saved, open, locale, onlinePayment, onOpen, sound, notifications }) => {
  const t = menuStrings(locale)
  const tracking = useOrderTracking({ orderId: saved.orderId, token: saved.token })
  const remove = useMyOrders((state) => state.remove)
  const markFinished = useMyOrders((state) => state.markFinished)
  const status = tracking.order?.status
  const finished = status !== undefined && isFinished(status)

  useEffect(() => {
    if (tracking.notFound) remove(saved.orderId)
  }, [tracking.notFound, remove, saved.orderId])

  useEffect(() => {
    if (finished) markFinished(saved.orderId, new Date().toISOString())
  }, [finished, markFinished, saved.orderId])

  useOrderAlerts(tracking.order, { sound, notifications, locale })

  const number = t.orderNumber.replace('{number}', String(saved.orderNumber))
  return (
    <div className="menu-your-order flex items-center rounded-full border border-menu-border bg-menu-card">
      <button
        type="button"
        onClick={() => onOpen(saved.orderId)}
        className={cn(
          'menu-btn rounded-full px-3 py-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-menu-primary',
          status === 'prepared' && 'is-active',
        )}
      >
        {number}
        {status && ` · ${t[STATUS_LABEL[status]]}`}
        {status && !finished && !tracking.live && ` · ${t.reconnecting}`}
      </button>
      {finished && (
        <button
          type="button"
          aria-label={`${t.removeOrder} ${number}`}
          onClick={() => remove(saved.orderId)}
          className="menu-btn rounded-full p-1.5 hover:bg-menu-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-menu-primary"
        >
          <X className="size-4" aria-hidden />
        </button>
      )}
      {open && tracking.order && (
        <OrderTracker
          order={tracking.order}
          token={saved.token}
          live={tracking.live}
          locale={locale}
          onlinePayment={onlinePayment}
          sound={sound}
          notifications={notifications}
          onUpdate={tracking.setOrder}
          onClose={() => onOpen(null)}
        />
      )}
    </div>
  )
}

const ALERT_TITLE: Partial<Record<GuestOrder['status'], keyof MenuStrings>> = {
  prepared: 'readyTitle',
  preparing: 'preparingTitle',
  served: 'servedTitle',
  cancelled: 'cancelledTitle',
}

/**
 * The guest's alerts for one order (sdq's status effect): a change from the last seen status
 * (never on the first snapshot, so a reload doesn't ring) to
 * - `prepared`: `notify(t.readyTitle, { whenVisible: true, tag })`: the guest hears the tone they
 *   picked even with the menu open (acceptance), and the phone vibrates when chosen;
 * - `preparing` / `served` / `cancelled`: `notify(title, { tag })` (only a hidden tab alerts).
 * `tag` = `order-<id>`, so OS notifications of one order replace each other.
 */
export const useOrderAlerts = (
  order: GuestOrder | undefined,
  args: { sound: AlertSound; notifications: BrowserNotifications; locale: TypedLocale },
): void => {
  const { notifications, locale } = args
  const seen = useRef<GuestOrder['status'] | undefined>(undefined)
  const status = order?.status
  const id = order?.id
  const orderNumber = order?.orderNumber

  useEffect(() => {
    if (status === undefined) return
    const previous = seen.current
    seen.current = status
    if (previous === undefined || previous === status) return
    const titleKey = ALERT_TITLE[status]
    if (!titleKey) return
    const title = menuStrings(locale)[titleKey].replace('{number}', String(orderNumber))
    notifications.notify(title, { tag: `order-${id}`, whenVisible: status === 'prepared' })
  }, [status, id, orderNumber, notifications, locale])
}
