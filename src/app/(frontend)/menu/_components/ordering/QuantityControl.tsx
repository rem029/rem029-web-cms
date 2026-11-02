'use client'

import type { TypedLocale } from 'payload'
import React from 'react'

import { menuStrings } from '../../_i18n'
import { touchTarget } from '../chip'

export type QuantityControlProps = {
  value: number
  /** 1 in the item view; 0 in the cart (− at 1 removes the line) */
  min: number
  max: number
  onChange: (value: number) => void
  /** what the buttons are for, read by screen readers ("Quantity of Soup") */
  label: string
  locale: TypedLocale
}

/**
 * − 2 + (sdq `item-quantity-control.tsx`): two 44px buttons around the number, the number
 * announced (`aria-live="polite"`), − disabled at `min`, + at `max`. Classes `menu-qty`,
 * `menu-qty-btn`, `menu-qty-value`; logical spacing, so the order flips in Arabic.
 */
export const QuantityControl: React.FC<QuantityControlProps> = ({
  value,
  min,
  max,
  onChange,
  label,
  locale,
}) => {
  const t = menuStrings(locale)

  return (
    <div
      role="group"
      aria-label={label}
      className="menu-qty flex items-center gap-2 text-menu-text"
    >
      <button
        type="button"
        aria-label={t.decrease}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        className={`menu-btn menu-qty-btn ${touchTarget} flex size-9 items-center justify-center rounded border border-menu-border hover:bg-menu-card disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-menu-primary`}
      >
        −
      </button>
      <span aria-live="polite" className="menu-qty-value min-w-[2ch] text-center font-medium">
        {value}
      </span>
      <button
        type="button"
        aria-label={t.increase}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        className={`menu-btn menu-qty-btn ${touchTarget} flex size-9 items-center justify-center rounded border border-menu-border hover:bg-menu-card disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-menu-primary`}
      >
        +
      </button>
    </div>
  )
}
