'use client'

import type { TypedLocale } from 'payload'
import React, { useId } from 'react'

import type { GuestOrder } from '@/common/utils/guestOrder'
import { formatMinor } from '@/common/utils/money'

import { menuStrings } from '../../_i18n'

export type ReceiptProps = {
  order: GuestOrder
  locale: TypedLocale
}

const formatPaidTime = (iso: string, locale: TypedLocale): string => {
  try {
    return new Intl.DateTimeFormat(locale, {
      timeStyle: 'short',
      dateStyle: 'medium',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

/** An order's lines: "2 × Karak", with the breakdown (base, add-ons, line total) when prices show */
export const OrderLines: React.FC<ReceiptProps> = ({ order, locale }) => {
  const t = menuStrings(locale)
  return (
    <ul className="divide-y divide-menu-border py-2">
      {order.lines.map((line, lineIndex) => {
        const optionsTotal = line.options.reduce((sum, opt) => sum + (opt.price ?? 0), 0)
        const base = (line.unitPrice ?? 0) - optionsTotal

        return (
          <li key={`${line.title}-${lineIndex}`} className="py-2">
            <p className="font-medium text-menu-text">
              {line.quantity} × {line.title}
            </p>

            {order.showPrices && (
              <dl className="mt-1 space-y-1 text-sm text-menu-muted">
                {line.options.length > 0 && line.unitPrice !== null && (
                  <div className="flex justify-between gap-3">
                    <dt>{t.base}</dt>
                    <dd>
                      <bdi dir="ltr">{formatMinor(base, order.currency, locale)}</bdi>
                    </dd>
                  </div>
                )}
                {line.options.map((option, optIndex) => (
                  <div key={`${option.label}-${optIndex}`} className="flex justify-between gap-3">
                    <dt>{option.label}</dt>
                    <dd>
                      {option.price !== null && option.price > 0 && (
                        <>
                          + <bdi dir="ltr">{formatMinor(option.price, order.currency, locale)}</bdi>
                        </>
                      )}
                    </dd>
                  </div>
                ))}
                {line.lineTotal !== null && (
                  <div className="flex justify-between gap-3 font-semibold text-menu-text">
                    <dt>{t.total}</dt>
                    <dd>
                      <bdi dir="ltr">{formatMinor(line.lineTotal, order.currency, locale)}</bdi>
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/**
 * The receipt of a paid order (rem0018 phase 3 step 2b): order number, table, paid time
 * (`Intl.DateTimeFormat` in the guest's locale), "Paid by cash / card / online payment", each
 * line with its breakdown when prices show (the plan's price breakdown: base = unitPrice minus
 * the add-ons, each add-on with its price, the line total; `lineBreakdown`-style rows in a
 * `<dl>`, as the item view: the theme css styles bare spans), and the amount paid. With prices
 * hidden: lines as "2 × Karak" and the amount paid only. Renders nothing until
 * `order.receipt` is set. Class `menu-receipt`.
 */
export const Receipt: React.FC<ReceiptProps> = ({ order, locale }) => {
  const headingId = useId()
  const t = menuStrings(locale)

  if (!order.receipt) {
    return null
  }

  const { receipt } = order
  const paidTime = formatPaidTime(receipt.paidAt, locale)

  const methodLabel =
    receipt.method === 'cash' ? t.cash : receipt.method === 'card' ? t.card : t.online
  const paidByText = t.paidBy.replace('{method}', methodLabel)

  return (
    <section
      className="menu-receipt rounded border border-menu-border bg-menu-card p-4 text-menu-text"
      aria-labelledby={headingId}
    >
      <div className="flex flex-col gap-1 border-b border-menu-border pb-3">
        <h3 id={headingId} className="text-lg font-semibold text-menu-text">
          {t.receipt}
        </h3>
        {order.orderNumber !== null && (
          <p className="text-sm text-menu-muted">
            {t.orderNumber.replace('{number}', String(order.orderNumber))}
          </p>
        )}
        {order.table && (
          <p className="text-sm text-menu-muted">
            {t.table} {order.table}
          </p>
        )}
        <p className="text-sm text-menu-muted">
          <time dateTime={receipt.paidAt}>{paidTime}</time>
        </p>
      </div>

      <OrderLines order={order} locale={locale} />

      <div className="flex justify-between gap-3 border-t border-menu-border pt-3 font-semibold text-menu-text">
        <div className="text-menu-text">{paidByText}</div>
        <bdi dir="ltr">{formatMinor(receipt.amount, order.currency, locale)}</bdi>
      </div>
    </section>
  )
}
