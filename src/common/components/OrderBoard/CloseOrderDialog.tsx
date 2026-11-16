'use client'

import { Button } from '@payloadcms/ui'
import React, { useEffect, useState } from 'react'

import type { CloseOrderInput } from '@/collections/Orders/utils/closeOrder'
import type { CloseReason } from '@/collections/Orders/utils/transitions'
import type { Order } from '@/payload-types'

import { OrderDisplay } from './OrderDisplay'

/** What the cashier picks; the order id comes from the board. */
export type CloseEntry = Omit<CloseOrderInput, 'orderId'>

export type CloseOrderDialogProps = {
  order: Order
  busy?: boolean
  onConfirm: (entry: CloseEntry) => void
  onClose: () => void
}

/** The reasons to close without payment, as `checkClose` takes them (`CloseReason`). */
export const CLOSE_REASON_LABELS: Record<CloseReason, string> = {
  walked_out: 'Guest walked out',
  complimentary: 'Complimentary',
  staff_meal: 'Staff meal',
  other: 'Other',
}

// the radios' order
const CLOSE_REASONS: CloseReason[] = ['walked_out', 'complimentary', 'staff_meal', 'other']

/**
 * The cashier's Close order (rem0018 phase 4 step 2c; `closeOrder`, phase 2): same shell as
 * `ConfirmDialog`. English only.
 * 1. title "Close Order <n>", the lines (`OrderDisplay`)
 * 2. a paid order (`paymentStatus` paid): "The payment is taken. Close the order?" and
 *    "Close order" → `onConfirm({ outcome: 'paid' })`
 * 3. an unpaid order: "Close without payment" with the reasons as radios (`CLOSE_REASON_LABELS`,
 *    none picked); `other` shows a required "Note" (max 500, trimmed); "Close order" disabled
 *    until a reason (and a note for other) → `onConfirm({ outcome: 'unpaid', reason, note })`
 *    (note only with other); a hint "To close as paid, take the payment first."
 * 4. "Keep open" → `onClose`; Escape and the backdrop too, unless `busy`
 */
export const CloseOrderDialog: React.FC<CloseOrderDialogProps> = ({
  order,
  busy,
  onConfirm,
  onClose,
}) => {
  const isPaid = order.paymentStatus === 'paid'
  const [selectedReason, setSelectedReason] = useState<CloseReason | null>(null)
  const [note, setNote] = useState('')

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [busy, onClose])

  const canClose =
    isPaid || (selectedReason !== null && (selectedReason !== 'other' || note.trim().length > 0))

  const handleConfirm = () => {
    if (!canClose || busy) return
    if (isPaid) {
      onConfirm({ outcome: 'paid' })
    } else if (selectedReason !== null) {
      onConfirm({
        outcome: 'unpaid',
        reason: selectedReason,
        ...(selectedReason === 'other' && note.trim() ? { note: note.trim() } : {}),
      })
    }
  }

  return (
    <div
      className="order-board__dialog-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) {
          onClose()
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="close-order-dialog-title"
        className="order-board__dialog"
      >
        <h2 id="close-order-dialog-title">Close Order {order.orderNumber ?? order.id}</h2>

        <div className="order-board__dialog-content">
          <OrderDisplay order={order} />

          {isPaid ? (
            <p className="order-board__dialog-hint">The payment is taken. Close the order?</p>
          ) : (
            <div className="order-board__dialog-section">
              <h3>Close without payment</h3>
              <div
                className="order-board__close-reasons"
                role="radiogroup"
                aria-label="Reason for closing without payment"
              >
                {CLOSE_REASONS.map((key) => (
                  <label key={key} className="order-board__close-reason">
                    <input
                      type="radio"
                      name="close-reason"
                      value={key}
                      checked={selectedReason === key}
                      disabled={busy}
                      onChange={() => setSelectedReason(key)}
                    />
                    {CLOSE_REASON_LABELS[key]}
                  </label>
                ))}
              </div>

              {selectedReason === 'other' && (
                <div className="order-board__dialog-field">
                  <label htmlFor="close-order-note">Note</label>
                  <textarea
                    id="close-order-note"
                    maxLength={500}
                    rows={3}
                    value={note}
                    disabled={busy}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Reason for closing without payment…"
                  />
                </div>
              )}

              <p className="order-board__dialog-hint">To close as paid, take the payment first.</p>
            </div>
          )}
        </div>

        <div className="order-board__dialog-actions">
          <Button
            buttonStyle="secondary"
            size="large"
            margin={false}
            disabled={busy}
            onClick={onClose}
          >
            Keep open
          </Button>
          <Button
            buttonStyle="primary"
            size="large"
            margin={false}
            disabled={!canClose || busy}
            onClick={handleConfirm}
          >
            Close order
          </Button>
        </div>
      </div>
    </div>
  )
}
