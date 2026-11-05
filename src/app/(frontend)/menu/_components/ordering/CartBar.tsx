'use client'

import { X } from 'lucide-react'
import type { TypedLocale } from 'payload'
import React, { useCallback, useState } from 'react'

import { lineBreakdown, type LineBreakdown } from '@/common/utils/linePrice'
import { formatMinor, toMinor } from '@/common/utils/money'
import { cn } from '@/utilities/ui'

import { placeOrderAction } from '../../_actions/orders'
import type { GuestMenuItem } from '../../_data/menuData'
import { MAX_QUANTITY } from '../../_data/orderLimits'
import type { MenuOrdering } from '../../_data/ordering'
import { useModalDialog } from '../../_hooks/useModalDialog'
import { guestErrorText, menuStrings, type MenuStrings } from '../../_i18n'
import { useCartStore, type CartLine } from '../../_store/cart'
import { touchTarget } from '../chip'
import { QuantityControl } from './QuantityControl'

export type PlacedOrder = { orderId: number; orderNumber: number; guestToken: string }

export type CartBarProps = {
  /** every item on the menu, to price and title the cart's lines */
  items: GuestMenuItem[]
  currency: string
  locale: TypedLocale
  ordering: MenuOrdering
  /** opens the table picker (Place order without a table) */
  onPickTable: () => void
  /** after placeOrderAction succeeds; step 2b opens the tracker */
  onPlaced: (order: PlacedOrder) => void
}

// a cart line with what the screens show: its item's title and the price breakdown
type PricedLine = { line: CartLine; title: string; breakdown: LineBreakdown }

const priceLine = (line: CartLine, item: GuestMenuItem, currency: string): PricedLine => {
  const options = item.modifierGroups
    .flatMap((group) => group.options)
    .filter((option) => line.optionIds.includes(option.id))
    .map((option) => ({
      label: option.label,
      price: option.price !== null ? toMinor(option.price, currency) : null,
    }))
  const breakdown = lineBreakdown({
    basePrice: toMinor(item.price, currency),
    options,
    quantity: line.quantity,
  })
  return { line, title: item.title, breakdown }
}

// "Closed, opens Monday at 08:00", or "Closed" when no day opens
const closedText = (ordering: MenuOrdering, t: MenuStrings): string => {
  const next = ordering.open.next
  if (!next) return t.closed
  return t.closedOpens.replace('{day}', t[next.weekday]).replace('{time}', next.opens)
}

const Money: React.FC<{ minor: number; currency: string; locale: TypedLocale }> = ({
  minor,
  currency,
  locale,
}) => <bdi dir="ltr">{formatMinor(minor, currency, locale)}</bdi>

/**
 * The cart (sdq `cart-bar.tsx`): a bar fixed to the bottom while the cart has lines ("3 items ·
 * QAR 36.00 · View order"), which opens a sheet (<dialog>) with each line's breakdown
 * (`lineBreakdown`: base, each add-on with its price, the line total, × quantity) and a
 * `QuantityControl`, the order total, the guest's name and a note, and **Place order**.
 * Prices hidden when `ordering.showPrices` is off (lines show names and quantities only).
 * Place order is disabled while closed when the business takes orders only while open (the
 * sheet says "Closed, opens Mon at 8:00"), and opens the table picker when no table is picked.
 * A refusal shows its `GuestError` in the guest's words; success clears the cart (keeps the
 * table) and calls `onPlaced`. Classes `menu-cart-bar`, `menu-cart`, `menu-cart-line`,
 * `menu-cart-total`, `menu-place-order`.
 */
export const CartBar: React.FC<CartBarProps> = (props) => {
  const { items, currency, locale, ordering } = props
  const t = menuStrings(locale)
  const lines = useCartStore((state) => state.lines)
  const [open, setOpen] = useState(false)
  const closeSheet = useCallback(() => setOpen(false), [])

  const priced = lines.flatMap((line) => {
    const item = items.find((entry) => entry.id === line.itemId)
    return item ? [priceLine(line, item, currency)] : []
  })
  if (priced.length === 0) return null

  const count = priced.reduce((sum, { line }) => sum + line.quantity, 0)
  const total = priced.reduce((sum, { breakdown }) => sum + breakdown.lineTotal, 0)

  return (
    <>
      <div className="menu-cart-bar fixed inset-x-0 bottom-0 z-30 border-t border-menu-border bg-menu-bg px-4 pb-[env(safe-area-inset-bottom)] pt-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            touchTarget,
            'menu-btn mx-auto mb-3 flex w-full max-w-lg items-center justify-between gap-3 rounded bg-menu-primary px-4 py-3 font-medium text-menu-primary-text hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-menu-primary focus-visible:ring-offset-2',
          )}
        >
          <span>{count === 1 ? t.oneItem : t.items.replace('{count}', String(count))}</span>
          {ordering.showPrices && <Money minor={total} currency={currency} locale={locale} />}
          <span>{t.viewOrder}</span>
        </button>
      </div>
      {open && <CartSheet {...props} priced={priced} total={total} onClose={closeSheet} />}
    </>
  )
}

// the open cart: lines, total, name, note and Place order
const CartSheet: React.FC<
  CartBarProps & { priced: PricedLine[]; total: number; onClose: () => void }
> = ({ currency, locale, ordering, onPickTable, onPlaced, priced, total, onClose }) => {
  const t = menuStrings(locale)
  const { ref, close } = useModalDialog(onClose)
  const guestName = useCartStore((state) => state.guestName)
  const notes = useCartStore((state) => state.notes)
  const tableSlug = useCartStore((state) => state.tableSlug)
  const setQuantity = useCartStore((state) => state.setQuantity)
  const setGuestName = useCartStore((state) => state.setGuestName)
  const setNotes = useCartStore((state) => state.setNotes)
  const clear = useCartStore((state) => state.clear)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const closedNow = ordering.ordersOnlyWhenOpen && !ordering.open.open

  const placeOrder = async () => {
    if (!tableSlug) {
      onPickTable()
      return
    }
    setPending(true)
    setError(null)
    try {
      const result = await placeOrderAction({
        menuSlug: ordering.menuSlug,
        tableSlug,
        guestName,
        notes,
        lines: priced.map(({ line }) => ({
          itemId: line.itemId,
          quantity: line.quantity,
          optionIds: line.optionIds,
        })),
        locale,
      })
      if (!result.ok) {
        setError(guestErrorText(result.error, t))
        return
      }
      clear()
      close()
      onPlaced({
        orderId: result.orderId,
        orderNumber: result.orderNumber,
        guestToken: result.guestToken,
      })
    } catch (err) {
      console.warn('place order failed', err)
      setError(t.failed)
    } finally {
      setPending(false)
    }
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby="cart-title"
      // a click on the backdrop lands on the dialog itself
      onClick={(event) => event.target === event.currentTarget && close()}
      className="menu-cart menu-theme m-0 mt-auto w-full max-w-none rounded-t-lg bg-menu-bg p-0 text-menu-text backdrop:bg-black/50 sm:m-auto sm:max-w-lg sm:rounded-lg"
    >
      <div className="max-h-[85dvh] overflow-y-auto p-5">
        <div className="flex items-start gap-3">
          <h2 id="cart-title" className="flex-1 text-2xl font-semibold">
            {t.yourOrder}
          </h2>
          <button
            type="button"
            aria-label={t.close}
            onClick={close}
            className="menu-btn rounded-full p-1.5 hover:bg-menu-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-menu-primary"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <ul className="mt-4 divide-y divide-menu-border">
          {priced.map(({ line, title, breakdown }) => (
            <li key={line.key} className="menu-cart-line flex items-start gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {title} × {line.quantity}
                  {ordering.showPrices && (
                    <span className="ms-2 text-menu-muted">
                      <Money minor={breakdown.base} currency={currency} locale={locale} />
                    </span>
                  )}
                </p>
                {breakdown.addOns.length > 0 && (
                  <ul className="mt-1 text-sm text-menu-muted">
                    {breakdown.addOns.map((addOn) => (
                      <li key={addOn.label}>
                        {addOn.label}
                        {ordering.showPrices && addOn.price !== null && (
                          <span className="ms-1">
                            + <Money minor={addOn.price} currency={currency} locale={locale} />
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {ordering.showPrices && (
                  <p className="mt-1 font-semibold">
                    <Money minor={breakdown.lineTotal} currency={currency} locale={locale} />
                  </p>
                )}
              </div>
              <QuantityControl
                value={line.quantity}
                min={0}
                max={MAX_QUANTITY}
                onChange={(quantity) => setQuantity(line.key, quantity)}
                label={`${t.quantity} ${title}`}
                locale={locale}
              />
            </li>
          ))}
        </ul>

        {ordering.showPrices && (
          <p className="menu-cart-total mt-2 flex justify-between border-t border-menu-border pt-3 text-lg font-semibold">
            <span>{t.total}</span>
            <Money minor={total} currency={currency} locale={locale} />
          </p>
        )}

        <label className="mt-4 block text-sm font-medium">
          {t.yourName}
          <input
            type="text"
            value={guestName}
            maxLength={120}
            onChange={(event) => setGuestName(event.target.value)}
            className="mt-1 block w-full rounded border border-menu-border bg-menu-bg px-3 py-2 text-base text-menu-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-menu-primary"
          />
        </label>
        <label className="mt-3 block text-sm font-medium">
          {t.note}
          <textarea
            value={notes}
            maxLength={500}
            rows={2}
            onChange={(event) => setNotes(event.target.value)}
            className="mt-1 block w-full rounded border border-menu-border bg-menu-bg px-3 py-2 text-base text-menu-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-menu-primary"
          />
        </label>

        {closedNow && (
          <p className="mt-4 text-sm text-menu-muted">
            {closedText(ordering, t)}. {t.ordersWhenOpen}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-4 text-sm font-medium">
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={pending || closedNow}
          onClick={placeOrder}
          className={cn(
            touchTarget,
            'menu-btn menu-place-order mt-4 flex w-full items-center justify-center rounded bg-menu-primary px-4 py-3 font-medium text-menu-primary-text hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-menu-primary disabled:pointer-events-none disabled:opacity-50',
          )}
        >
          {pending ? t.placing : t.placeOrder}
        </button>
      </div>
    </dialog>
  )
}
