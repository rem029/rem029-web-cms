import type { TypedLocale } from 'payload'
import React from 'react'

import type { GuestMenuItem } from '../_data/menuData'

export type MenuItemCardProps = {
  item: GuestMenuItem
  currency: string
  locale: TypedLocale
  onOpen: (item: GuestMenuItem) => void
}

/**
 * One item on the guest menu (sdq `cards.tsx`): photo (when it has one), title, a two-line
 * description, the price and an "Out of stock" badge, the whole card a button that opens the
 * item view. Out of stock items stay visible, dimmed. The price is `<bdi dir="ltr">`, so Arabic
 * reads "9.00 US$" instead of the bidi-scrambled "$US 9.00".
 */
export const MenuItemCard: React.FC<MenuItemCardProps> = (props) => {
  // 1. <button type="button" onClick={() => onOpen(item)} className="… text-start">
  // 2. img (loading lazy, alt '') when imageUrl
  // 3. title, description (line-clamp-2), price via formatPrice(item.price, currency, locale)
  // 4. !inStock → t.outOfStock badge + opacity
  void props
  return <button type="button" />
}
