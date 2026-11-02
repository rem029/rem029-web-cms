'use client'

import { X } from 'lucide-react'
import type { TypedLocale } from 'payload'
import React, { useState } from 'react'

import { formatPrice } from '@/common/utils/formatPrice'
import { lineBreakdown } from '@/common/utils/linePrice'
import { formatMinor, toMinor } from '@/common/utils/money'

import type { GuestMenuItem } from '../_data/menuData'
import { MAX_QUANTITY } from '../_data/orderLimits'
import { useModalDialog } from '../_hooks/useModalDialog'
import { menuStrings } from '../_i18n'
import { touchTarget } from './chip'
import { QuantityControl } from './ordering/QuantityControl'

export type ItemViewProps = {
  item: GuestMenuItem
  currency: string
  locale: TypedLocale
  onClose: () => void
  /**
   * rem0018 phase 3 step 2a: on a menu with ordering on, the choices become inputs and the view
   * ends with a quantity and **Add to cart**; without it the view stays read only (rem0017).
   */
  ordering?: ItemOrdering
}

export type ItemOrdering = {
  showPrices: boolean
  onAdd: (line: { itemId: number; optionIds: string[]; quantity: number }) => void
}

const List: React.FC<{ title: string; values: string[] }> = ({ title, values }) =>
  values.length === 0 ? null : (
    <section className="menu-item-view-list mt-4">
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
 * options as plain lists (group name, "Choose one" / "Choose any", "Required", the options,
 * "+ 2.00" after a choice with an extra price: rem0018).
 * A native <dialog> opened with showModal() (`useModalDialog`: focus kept inside, Escape and the
 * backdrop close it, focus goes back to the card); a bottom sheet on phones, centred on wider
 * screens.
 */
export const ItemView: React.FC<ItemViewProps> = ({
  item,
  currency,
  locale,
  onClose,
  ordering,
}) => {
  const t = menuStrings(locale)
  const { ref, close } = useModalDialog(onClose)

  const [selected, setSelected] = useState<Record<string, string[]>>({})
  const [quantity, setQuantity] = useState(1)

  const isOrdering = Boolean(ordering && item.inStock)
  const served = item.availability.filter((period) => period !== 'all_day')

  const missingRequiredGroup = isOrdering
    ? item.modifierGroups.find(
        (group) => group.required && (selected[group.name]?.length ?? 0) === 0,
      )
    : undefined

  const chosenOptions: { label: string; price: number | null }[] = []
  const optionIds: string[] = []

  if (isOrdering) {
    for (const group of item.modifierGroups) {
      const chosenInGroup = selected[group.name] ?? []
      for (const opt of group.options) {
        if (chosenInGroup.includes(opt.id)) {
          optionIds.push(opt.id)
          chosenOptions.push({
            label: opt.label,
            price: opt.price !== null ? toMinor(opt.price, currency) : null,
          })
        }
      }
    }
  }

  const breakdown = isOrdering
    ? lineBreakdown({
        basePrice: toMinor(item.price, currency),
        options: chosenOptions,
        quantity,
      })
    : null

  return (
    <dialog
      ref={ref}
      aria-labelledby="item-view-title"
      // a click on the backdrop lands on the dialog itself
      onClick={(event) => event.target === event.currentTarget && close()}
      className="menu-item-view menu-theme m-0 mt-auto w-full max-w-none rounded-t-lg bg-menu-bg p-0 text-menu-text backdrop:bg-black/50 sm:m-auto sm:max-w-lg sm:rounded-lg"
    >
      <div className="max-h-[85dvh] overflow-y-auto">
        {item.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- a CMS upload of any size
          <img
            src={item.imageUrl}
            alt=""
            className="menu-item-view-image aspect-video w-full object-cover"
          />
        )}
        <div className="p-5">
          <div className="flex items-start gap-3">
            <h2 id="item-view-title" className="menu-item-view-title flex-1 text-2xl font-semibold">
              {item.title}
            </h2>
            <button
              type="button"
              aria-label={t.close}
              onClick={close}
              className="menu-btn menu-item-view-close rounded-full p-1.5 hover:bg-menu-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-menu-primary"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <p className="menu-item-view-price mt-1 flex flex-wrap items-center gap-2 text-lg">
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
            <section key={group.name} className="menu-item-view-options mt-4">
              <h3 className="font-semibold">{group.name}</h3>
              <p className="text-sm text-menu-muted">
                {group.inputType === 'radio' ? t.chooseOne : t.chooseAny}
                {group.required && ` · ${t.required}`}
              </p>

              {isOrdering ? (
                <ul className="mt-2 space-y-2">
                  {group.options.map((option) => {
                    const isSelected = selected[group.name]?.includes(option.id) ?? false
                    return (
                      <li key={option.id}>
                        <label className="menu-item-view-choice flex cursor-pointer items-center gap-2.5 rounded border border-menu-border p-2.5 text-sm hover:bg-menu-card">
                          <input
                            type={group.inputType}
                            name={group.inputType === 'radio' ? group.name : option.id}
                            value={option.id}
                            checked={isSelected}
                            onChange={(e) => {
                              if (group.inputType === 'radio') {
                                setSelected((prev) => ({
                                  ...prev,
                                  [group.name]: [option.id],
                                }))
                              } else {
                                const checked = e.target.checked
                                setSelected((prev) => {
                                  const currentGroup = prev[group.name] ?? []
                                  return {
                                    ...prev,
                                    [group.name]: checked
                                      ? [...currentGroup, option.id]
                                      : currentGroup.filter((id) => id !== option.id),
                                  }
                                })
                              }
                            }}
                            className="size-4 accent-menu-primary"
                          />
                          <span className="flex-1 font-medium">{option.label}</span>
                          {option.price !== null && ordering?.showPrices && (
                            <span className="menu-item-view-option-price text-menu-muted">
                              <bdi dir="ltr">+ {formatPrice(option.price, currency, locale)}</bdi>
                            </span>
                          )}
                        </label>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <ul className="mt-1 list-disc ps-5">
                  {group.options.map((option) => (
                    <li key={option.label}>
                      {option.label}
                      {option.price !== null && (
                        <span className="menu-item-view-option-price ms-1 text-menu-muted">
                          <bdi dir="ltr">+ {formatPrice(option.price, currency, locale)}</bdi>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          {isOrdering && ordering && breakdown && (
            <>
              {ordering.showPrices && (
                // rows, not inline spans: the tenant's theme css styles bare `span`s (walkthrough
                // 2026-11-02: every word on its own line); base and add-ons only when there are
                // add-ons, else the total alone
                <dl className="menu-item-view-breakdown mt-5 space-y-1 border-t border-menu-border pt-4 text-sm text-menu-muted">
                  {breakdown.addOns.length > 0 && (
                    <div className="flex justify-between gap-3">
                      <dt>{t.base}</dt>
                      <dd>
                        <bdi dir="ltr">{formatMinor(breakdown.base, currency, locale)}</bdi>
                      </dd>
                    </div>
                  )}
                  {breakdown.addOns.map((addOn) => (
                    <div key={addOn.label} className="flex justify-between gap-3">
                      <dt>{addOn.label}</dt>
                      <dd>
                        {addOn.price !== null && (
                          <bdi dir="ltr">+ {formatMinor(addOn.price, currency, locale)}</bdi>
                        )}
                      </dd>
                    </div>
                  ))}
                  <div className="flex justify-between gap-3 font-semibold text-menu-text">
                    <dt>{t.total}</dt>
                    <dd>
                      <bdi dir="ltr">{formatMinor(breakdown.lineTotal, currency, locale)}</bdi>
                    </dd>
                  </div>
                </dl>
              )}

              <div className="mt-5 flex items-center gap-3">
                <QuantityControl
                  value={quantity}
                  min={1}
                  max={MAX_QUANTITY}
                  onChange={setQuantity}
                  label={`${t.quantity} ${item.title}`}
                  locale={locale}
                />
                <button
                  type="button"
                  disabled={Boolean(missingRequiredGroup)}
                  onClick={() => {
                    ordering.onAdd({
                      itemId: item.id,
                      optionIds,
                      quantity,
                    })
                    close()
                  }}
                  className={`menu-btn menu-add-to-cart ${touchTarget} flex flex-1 items-center justify-center rounded bg-menu-primary px-4 py-2 font-medium text-menu-primary-text hover:opacity-90 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-menu-primary`}
                >
                  {missingRequiredGroup
                    ? t.chooseA.replace('{group}', missingRequiredGroup.name)
                    : t.addToCart}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </dialog>
  )
}
