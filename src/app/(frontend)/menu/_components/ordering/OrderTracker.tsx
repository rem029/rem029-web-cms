'use client'

import { X } from 'lucide-react'
import type { TypedLocale } from 'payload'
import React, { useState } from 'react'

import type { AlertSound } from '@/common/components/AlertSounds/useAlertSound'
import type { BrowserNotifications } from '@/common/components/AlertSounds/useBrowserNotifications'
import type { GuestOrder } from '@/common/utils/guestOrder'
import { formatMinor } from '@/common/utils/money'
import { cn } from '@/utilities/ui'

import { cancelOrderAction, requestAssistanceAction } from '../../_actions/orders'
import type { GuestResult } from '../../_data/guestOrders'
import { useModalDialog } from '../../_hooks/useModalDialog'
import { guestErrorText, menuStrings, type MenuStrings } from '../../_i18n'
import { NotificationPrompt } from './NotificationPrompt'
import { PayOptions } from './PayOptions'
import { OrderLines, Receipt } from './Receipt'

/** the steps the tracker draws, in order (cancelled is shown on its own) */
export const TRACKER_STEPS = [
  'pending',
  'confirmed',
  'preparing',
  'prepared',
  'served',
  'completed',
] as const satisfies readonly GuestOrder['status'][]

export type OrderTrackerProps = {
  order: GuestOrder
  token: string
  /** the stream is open: "Live", else "Reconnecting…" */
  live: boolean
  locale: TypedLocale
  onlinePayment: boolean
  sound: AlertSound
  notifications: BrowserNotifications
  /** a guest action returned a new snapshot (cancel, call staff, ask for the bill) */
  onUpdate: (order: GuestOrder) => void
  onClose: () => void
}

type Busy = 'cancel' | 'staff' | 'bill'

const STEP_LABEL: Record<(typeof TRACKER_STEPS)[number], keyof MenuStrings> = {
  pending: 'statusPending',
  confirmed: 'statusConfirmed',
  preparing: 'statusPreparing',
  prepared: 'statusPrepared',
  served: 'statusServed',
  completed: 'statusCompleted',
}

const actionClass =
  'menu-btn rounded border border-menu-border px-3 py-2 text-sm font-medium hover:bg-menu-card disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-menu-primary'

/**
 * One order, opened from "Your orders" (rem0018 phase 3 step 2b, sdq `order-tracker.tsx`): a
 * sheet (<dialog>, `useModalDialog`, as the cart) with the number, "Live" / "Reconnecting…",
 * the steps (pending → … → completed, the reached ones marked, `aria-current` on the current
 * one; "Cancelled" alone when cancelled), table, name and note, the lines (breakdown when prices
 * show), the total, and the actions:
 * - **Cancel order** only while pending (`cancelOrderAction`; `cannotCancel` explains a race
 *   with the kitchen);
 * - **Call staff** and **Ask for the bill** while the order is open (`requestAssistanceAction`
 *   kind `staff` / `bill`; done: "A member of staff is on the way." / "Your bill is on the way.";
 *   `tooSoon` within a minute);
 * - `PayOptions` while unpaid, `Receipt` once paid; `NotificationPrompt` while not finished.
 * Every action's returned snapshot goes to `onUpdate`; refusals show in the guest's words
 * (role=alert). Colours from the menu tokens only. Classes `menu-tracker`, `menu-tracker-step`
 * (`is-active` / `is-done`), `menu-tracker-live`, `menu-call-staff`, `menu-ask-bill`,
 * `menu-cancel-order`.
 */
export const OrderTracker: React.FC<OrderTrackerProps> = (props) => {
  const { order, token, live, locale, onlinePayment, sound, notifications, onUpdate, onClose } =
    props
  const t = menuStrings(locale)
  const { ref, close } = useModalDialog(onClose)
  const [busy, setBusy] = useState<Busy | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const open = order.status !== 'completed' && order.status !== 'cancelled'
  const current = TRACKER_STEPS.findIndex((step) => step === order.status)
  const args = { orderId: order.id, token }

  const run = async (
    kind: Busy,
    action: () => Promise<GuestResult<{ order: GuestOrder }>>,
    doneText: string | null,
  ) => {
    setBusy(kind)
    setDone(null)
    setError(null)
    try {
      const result = await action()
      if (result.ok) {
        onUpdate(result.order)
        setDone(doneText)
      } else {
        setError(guestErrorText(result.error, t))
      }
    } catch (err) {
      console.warn('order action failed', kind, err)
      setError(t.failed)
    } finally {
      setBusy(null)
    }
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby="tracker-title"
      // a click on the backdrop lands on the dialog itself
      onClick={(event) => event.target === event.currentTarget && close()}
      className="menu-tracker menu-theme m-0 mt-auto w-full max-w-none rounded-t-lg bg-menu-bg p-0 text-menu-text backdrop:bg-black/50 sm:m-auto sm:max-w-lg sm:rounded-lg"
    >
      <div className="flex max-h-[85dvh] flex-col gap-4 overflow-y-auto p-5">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h2 id="tracker-title" className="text-2xl font-semibold">
              {t.orderNumber.replace('{number}', String(order.orderNumber))}
            </h2>
            <p role="status" className="menu-tracker-live text-sm text-menu-muted">
              {live ? t.live : t.reconnecting}
            </p>
          </div>
          <button
            type="button"
            aria-label={t.close}
            onClick={close}
            className="menu-btn rounded-full p-1.5 hover:bg-menu-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-menu-primary"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        {order.status === 'cancelled' ? (
          <p className="font-semibold">{t.statusCancelled}</p>
        ) : (
          <ol className="flex flex-col gap-1">
            {TRACKER_STEPS.map((step, index) => (
              <li
                key={step}
                aria-current={index === current ? 'step' : undefined}
                className={cn(
                  'menu-tracker-step flex items-center gap-2 text-sm before:size-2 before:shrink-0 before:rounded-full before:content-[""]',
                  index <= current ? 'is-done before:bg-menu-primary' : 'before:bg-menu-border',
                  index === current ? 'is-active font-semibold' : 'text-menu-muted',
                )}
              >
                {t[STEP_LABEL[step]]}
              </li>
            ))}
          </ol>
        )}

        {(order.table || order.guestName || order.notes) && (
          <div className="text-sm">
            {order.table && (
              <p>
                {t.table} {order.table}
              </p>
            )}
            {order.guestName && <p>{order.guestName}</p>}
            {order.notes && <p className="text-menu-muted">{order.notes}</p>}
          </div>
        )}

        {/* once paid the receipt lists the lines */}
        {!order.receipt && (
          <>
            <OrderLines order={order} locale={locale} />
            {order.showPrices && (
              <dl className="flex justify-between font-semibold">
                <dt>{t.total}</dt>
                <dd>
                  <bdi dir="ltr">{formatMinor(order.total, order.currency, locale)}</bdi>
                </dd>
              </dl>
            )}
          </>
        )}

        {open && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy !== null}
              onClick={() =>
                void run(
                  'staff',
                  () => requestAssistanceAction({ ...args, kind: 'staff' }),
                  t.staffCalled,
                )
              }
              className={cn('menu-call-staff', actionClass)}
            >
              {t.callStaff}
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() =>
                void run(
                  'bill',
                  () => requestAssistanceAction({ ...args, kind: 'bill' }),
                  t.billAsked,
                )
              }
              className={cn('menu-ask-bill', actionClass)}
            >
              {t.askBill}
            </button>
            {order.status === 'pending' && (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void run('cancel', () => cancelOrderAction(args), null)}
                className={cn('menu-cancel-order', actionClass)}
              >
                {busy === 'cancel' ? t.cancelling : t.cancelOrder}
              </button>
            )}
          </div>
        )}
        {done && (
          <p role="status" className="text-sm font-medium">
            {done}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm font-medium">
            {error}
          </p>
        )}

        <PayOptions order={order} token={token} locale={locale} onlinePayment={onlinePayment} />
        <Receipt order={order} locale={locale} />
        {open && <NotificationPrompt sound={sound} notifications={notifications} locale={locale} />}
      </div>
    </dialog>
  )
}
