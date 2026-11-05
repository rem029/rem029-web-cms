'use client'

import type { TypedLocale } from 'payload'
import React, { useState } from 'react'

import type { GuestOrder } from '@/common/utils/guestOrder'
import { formatMinor } from '@/common/utils/money'

import { payOnlineAction } from '../../_actions/orders'
import { guestErrorText, menuStrings } from '../../_i18n'

export type PayOptionsProps = {
  order: GuestOrder
  token: string
  locale: TypedLocale
  /** the business has an online provider (`MenuOrdering.onlinePayment`) */
  onlinePayment: boolean
}

/**
 * How the guest pays an unpaid order (rem0018 phase 3 step 2b): the total due (always, even with
 * prices hidden: the guest has to pay it), "Pay at the counter" as a line of text (always: no
 * tap needed, staff take the payment), and **Pay now** only with an online provider. Pay now
 * calls `payOnlineAction`, then `window.location.assign(redirectUrl)` (the provider's hosted
 * page; back on `/menu/<slug>?order=<id>`); a refusal shows its words
 * (`onlinePaymentUnavailable`, `orderNotFound`). Renders nothing once paid or waived. Class
 * `menu-pay-options`, button `menu-pay-now`.
 */
export const PayOptions: React.FC<PayOptionsProps> = ({ order, token, locale, onlinePayment }) => {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const t = menuStrings(locale)

  if (order.paymentStatus !== 'unpaid' || order.status === 'cancelled') {
    return null
  }

  const handlePayNow = async () => {
    setPending(true)
    setError(null)
    try {
      const result = await payOnlineAction({ orderId: order.id, token })
      if (!result.ok) {
        setError(guestErrorText(result.error, t))
        return
      }
      window.location.assign(result.redirectUrl)
    } catch (err) {
      console.warn('pay online failed', err)
      setError(t.failed)
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="menu-pay-options space-y-3 rounded border border-menu-border bg-menu-card p-4 text-menu-text">
      <div className="flex items-center justify-between gap-3 text-lg font-semibold">
        <div className="text-menu-text">{t.totalDue}</div>
        <bdi dir="ltr">{formatMinor(order.total, order.currency, locale)}</bdi>
      </div>
      <p className="text-sm text-menu-muted">{t.payAtCounter}</p>
      {onlinePayment && (
        <button
          type="button"
          disabled={pending}
          onClick={handlePayNow}
          className="menu-btn menu-pay-now flex w-full items-center justify-center rounded bg-menu-primary px-4 py-3 font-medium text-menu-primary-text hover:opacity-90 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-menu-primary"
        >
          {pending ? t.paying : t.payNow}
        </button>
      )}
      {error && (
        <p role="alert" className="text-sm font-medium text-menu-text">
          {error}
        </p>
      )}
    </section>
  )
}
