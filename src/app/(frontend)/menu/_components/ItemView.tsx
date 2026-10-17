'use client'

import type { TypedLocale } from 'payload'
import React from 'react'

import type { GuestMenuItem } from '../_data/menuData'

export type ItemViewProps = {
  item: GuestMenuItem
  currency: string
  locale: TypedLocale
  onClose: () => void
}

/**
 * An item's details (sdq `view-item.tsx` + `modal.tsx`), read only until rem0018 adds ordering:
 * photo, title, price, description, out of stock, allergens, tags, what it's served for, and its
 * options as plain lists (group name, "Choose one" / "Choose any", "Required", the options).
 * A native <dialog> opened with showModal() (focus trap, Escape and the backdrop close it); a
 * bottom sheet on phones, centred on wider screens.
 */
export const ItemView: React.FC<ItemViewProps> = (props) => {
  // 1. ref to <dialog>; effect: showModal() on mount (jsdom has no showModal → set open),
  //    'close' event → onClose
  // 2. close button (aria-label t.close), backdrop click closes
  // 3. img, h2 title, price (<bdi dir="ltr"> formatPrice), description, out of stock
  // 4. allergens / tags: heading + list of titles, each only when not empty
  // 5. availability (not all_day only): t.availability + period names
  // 6. modifierGroups: h3 name, t.chooseOne (radio) / t.chooseAny (checkbox), t.required,
  //    <ul> of option labels: text only, no inputs
  void props
  return <dialog />
}
