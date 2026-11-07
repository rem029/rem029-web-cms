import React from 'react'

import { lineBreakdown } from '@/common/utils/linePrice'
import { formatMinor } from '@/common/utils/money'
import type { Order } from '@/payload-types'

/**
 * An order's lines on a board card (rem0018 phase 4 step 2a, sdq `order-display`): quantity ×
 * title, the chosen add-ons under it, and with prices on the same breakdown as the guest
 * (`lineBreakdown`, `formatMinor` in the order's currency, locale `en`): base, each add-on, line
 * total; the order total at the bottom; notes. `order.showPrices` false → no amounts anywhere.
 * Class names `order-board__lines`, `__line`, `__addon`, `__total`, `__notes`.
 */
export const OrderDisplay: React.FC<{ order: Order }> = ({ order }) => {
  const currency = order.currency ?? 'QAR'
  const showPrices = order.showPrices ?? true

  return (
    <div className="order-board__lines">
      {order.items.map((item, index) => {
        const title = item.title ?? 'Item'
        const rawOptions = item.selectedOptions ?? []
        const options = rawOptions.map((opt) => ({
          label: opt.label ?? opt.option,
          price: opt.price ?? null,
        }))
        // unitPrice is the item's own price; the add-ons come on top (snapshotItems)
        const breakdown = lineBreakdown({
          basePrice: item.unitPrice ?? 0,
          options,
          quantity: item.quantity,
        })

        return (
          <div key={item.id ?? `item-${index}`} className="order-board__line">
            <div className="order-board__line-header">
              <span className="order-board__line-title">
                {item.quantity} × {title}
              </span>
              {showPrices && item.lineTotal !== null && item.lineTotal !== undefined && (
                <span className="order-board__line-total">
                  {formatMinor(item.lineTotal, currency, 'en')}
                </span>
              )}
            </div>

            {options.length > 0 && (
              <div className="order-board__addons">
                {showPrices && item.unitPrice !== null && (
                  <div className="order-board__addon">
                    <span>Base</span>
                    <span>{formatMinor(breakdown.base, currency, 'en')}</span>
                  </div>
                )}
                {options.map((opt, optIndex) => (
                  <div key={`opt-${optIndex}`} className="order-board__addon">
                    <span>{opt.label}</span>
                    {showPrices && opt.price !== null && opt.price > 0 && (
                      <span>+ {formatMinor(opt.price, currency, 'en')}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {showPrices && order.total !== null && order.total !== undefined && (
        <div className="order-board__total">
          <span>Total</span>
          <span>{formatMinor(order.total, currency, 'en')}</span>
        </div>
      )}

      {order.notes && <p className="order-board__notes">{order.notes}</p>}
    </div>
  )
}
