'use client'

import { X } from 'lucide-react'
import type { TypedLocale } from 'payload'
import React from 'react'

import { formatPrice } from '@/common/utils/formatPrice'

import type { GuestMenuItem } from '../_data/menuData'
import { useModalDialog } from '../_hooks/useModalDialog'
import { menuStrings } from '../_i18n'

export type ItemViewProps = {
  item: GuestMenuItem
  currency: string
  locale: TypedLocale
  onClose: () => void
}

const List: React.FC<{ title: string; values: string[] }> = ({ title, values }) =>
  values.length === 0 ? null : (
    <section className="mt-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-1 flex flex-wrap gap-1.5">
        {values.map((value) => (
          <li key={value} className="rounded-full border border-menu-border px-2.5 py-0.5 text-sm">
            {value}
          </li>
        ))}
      </ul>
    </section>
  )

/**
 * An item's details (sdq `view-item.tsx` + `modal.tsx`), read only until rem0018 adds ordering:
 * photo, title, price, description, out of stock, allergens, tags, what it's served for, and its
 * options as plain lists (group name, "Choose one" / "Choose any", "Required", the options).
 * A native <dialog> opened with showModal() (`useModalDialog`: focus kept inside, Escape and the
 * backdrop close it, focus goes back to the card); a bottom sheet on phones, centred on wider
 * screens.
 */
export const ItemView: React.FC<ItemViewProps> = ({ item, currency, locale, onClose }) => {
  const t = menuStrings(locale)
  const { ref, close } = useModalDialog(onClose)

  const served = item.availability.filter((period) => period !== 'all_day')

  return (
    <dialog
      ref={ref}
      aria-labelledby="item-view-title"
      // a click on the backdrop lands on the dialog itself
      onClick={(event) => event.target === event.currentTarget && close()}
      className="menu-theme m-0 mt-auto w-full max-w-none rounded-t-lg bg-menu-bg p-0 text-menu-text backdrop:bg-black/50 sm:m-auto sm:max-w-lg sm:rounded-lg"
    >
      <div className="max-h-[85dvh] overflow-y-auto">
        {item.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- a CMS upload of any size
          <img src={item.imageUrl} alt="" className="aspect-video w-full object-cover" />
        )}
        <div className="p-5">
          <div className="flex items-start gap-3">
            <h2 id="item-view-title" className="flex-1 text-2xl font-semibold">
              {item.title}
            </h2>
            <button
              type="button"
              aria-label={t.close}
              onClick={close}
              className="rounded-full p-1.5 hover:bg-menu-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-menu-primary"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-lg">
            <bdi dir="ltr">{formatPrice(item.price, currency, locale)}</bdi>
            {!item.inStock && (
              <span className="w-auto rounded bg-menu-border px-2 py-0.5 text-sm">
                {t.outOfStock}
              </span>
            )}
          </p>
          {item.description && <p className="mt-3 text-menu-muted">{item.description}</p>}
          <List title={t.allergens} values={item.allergens.map((allergen) => allergen.title)} />
          <List title={t.tags} values={item.tags.map((tag) => tag.title)} />
          <List title={t.availability} values={served.map((period) => t[period])} />
          {item.modifierGroups.map((group) => (
            <section key={group.name} className="mt-4">
              <h3 className="font-semibold">{group.name}</h3>
              <p className="text-sm text-menu-muted">
                {group.inputType === 'radio' ? t.chooseOne : t.chooseAny}
                {group.required && ` · ${t.required}`}
              </p>
              <ul className="mt-1 list-disc ps-5">
                {group.options.map((option) => (
                  <li key={option}>{option}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </dialog>
  )
}
