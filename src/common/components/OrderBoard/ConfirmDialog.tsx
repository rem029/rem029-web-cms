'use client'

import { Button } from '@payloadcms/ui'
import React, { useEffect, useRef, useState } from 'react'

import type { Order } from '@/payload-types'

import { OrderDisplay } from './OrderDisplay'

/**
 * The cancel confirmation (rem0018 phase 4 step 2a, sdq `confirm-dialog`; plan: "Cancel always
 * behind a confirmation dialog: order number, lines, reason"): `role="dialog"` with
 * `aria-modal`, the order number and its lines (`OrderDisplay`), a required reason (textarea,
 * max 500), "Keep order" and "Cancel order" (disabled until a reason; `busy` disables both).
 * Escape and the backdrop keep the order. Focus starts on the reason.
 */
export const ConfirmDialog: React.FC<{
  order: Order
  busy?: boolean
  onConfirm: (reason: string) => void
  onClose: () => void
}> = ({ order, busy, onConfirm, onClose }) => {
  const [reason, setReason] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [busy, onClose])

  const canCancel = reason.trim().length > 0 && !busy

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
        aria-labelledby="confirm-dialog-title"
        className="order-board__dialog"
      >
        <h2 id="confirm-dialog-title">Cancel Order {order.orderNumber}</h2>
        <div className="order-board__dialog-content">
          <OrderDisplay order={order} />
          <div className="order-board__dialog-field">
            <label htmlFor="cancel-reason">Reason for cancellation (required)</label>
            <textarea
              id="cancel-reason"
              ref={textareaRef}
              maxLength={500}
              rows={3}
              value={reason}
              disabled={busy}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Guest changed mind, Out of stock…"
            />
          </div>
        </div>
        <div className="order-board__dialog-actions">
          <Button buttonStyle="secondary" size="large" disabled={busy} onClick={onClose}>
            Keep order
          </Button>
          <Button
            buttonStyle="primary"
            size="large"
            disabled={!canCancel}
            onClick={() => {
              if (canCancel) {
                onConfirm(reason.trim())
              }
            }}
          >
            Cancel order
          </Button>
        </div>
      </div>
    </div>
  )
}
