import type { TypedLocale } from 'payload'
import React from 'react'

import { formatPrice } from '@/common/utils/formatPrice'
import { cn } from '@/utilities/ui'

import type { GuestMenuItem } from '../_data/menuData'
import { menuStrings } from '../_i18n'

export type MenuItemCardProps = {
  item: GuestMenuItem
  currency: string
  locale: TypedLocale
  onOpen: (item: GuestMenuItem) => void
}

/**
 * One item on the guest menu (sdq `cards.tsx`): photo (when it has one), title, a two-line
 * description, the price and an "Out of stock" badge, the whole card a button that opens the
 * item view. Out of stock items stay visible and readable: the badge says so and only the photo
 * is greyed (fading the whole card took the price below AA contrast). The price is `<bdi dir="ltr">`, so Arabic
 * reads "9.00 US$" instead of the bidi-scrambled "$US 9.00".
 */
export const MenuItemCard: React.FC<MenuItemCardProps> = ({ item, currency, locale, onOpen }) => {
  const t = menuStrings(locale)
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={cn(
        'menu-item-card',
        !item.inStock && 'is-out-of-stock',
        'flex w-full gap-3 overflow-hidden rounded border border-menu-border bg-menu-card p-3 text-start text-menu-text',
        'transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-menu-primary motion-reduce:transition-none',
      )}
    >
      <span className="menu-item-text flex min-w-0 flex-1 flex-col gap-1">
        <span className="menu-item-title font-semibold">{item.title}</span>
        {item.description && (
          <span className="menu-item-description line-clamp-2 text-sm text-menu-muted">
            {item.description}
          </span>
        )}
        <span className="mt-auto flex flex-wrap items-center gap-2 pt-1">
          <bdi dir="ltr" className="menu-item-price font-medium">
            {formatPrice(item.price, currency, locale)}
          </bdi>
          {!item.inStock && (
            <span className="menu-item-badge w-auto rounded bg-menu-border px-2 py-0.5 text-xs font-medium">
              {t.outOfStock}
            </span>
          )}
        </span>
      </span>
      {item.thumbnailUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- a CMS upload of any size
        <img
          src={item.thumbnailUrl}
          alt=""
          loading="lazy"
          className={cn(
            'menu-item-image',
            'size-24 shrink-0 rounded object-cover sm:size-28',
            !item.inStock && 'opacity-60 grayscale',
          )}
        />
      )}
    </button>
  )
}
