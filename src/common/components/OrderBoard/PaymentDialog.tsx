'use client'

import { Button } from '@payloadcms/ui'
import React, { useEffect, useRef, useState } from 'react'

import type { RecordPaymentInput } from '@/collections/Orders/utils/board'
import { formatMinor, toMinor } from '@/common/utils/money'
import type { Order, Payment } from '@/payload-types'

import { OrderDisplay } from './OrderDisplay'

/** What the cashier enters; the order id comes from the board. */
export type PaymentEntry = Omit<RecordPaymentInput, 'orderId'>

export type PaymentDialogProps = {
  order: Order
  // null: take a payment; a payment: show it read-only with Void
  payment: Payment | null
  busy?: boolean
  onSubmit: (entry: PaymentEntry) => void
  onVoid: (reason: string) => void
  onClose: () => void
}

/**
 * The cashier's payment dialog (rem0018 phase 4 step 2c; plan: "method chips cash / card; the
 * amount is the order total, no amount field; cash: received → change shown big; card: receipt
 * number required; remarks"). Same shell as `ConfirmDialog`: `role="dialog"`, `aria-modal`,
 * Escape and the backdrop close it unless `busy`; English only (admin rule).
 *
 * Take payment (`payment` null):
 * 1. title "Payment · Order <n>", the lines (`OrderDisplay`), "Amount due" = `formatMinor(order.total,
 *    currency, 'en')` (no amount field: one payment for the total, phase 2)
 * 2. method: two big toggle buttons "Cash" / "Card" (`aria-pressed`), Cash picked first
 * 3. cash: "Received" (`inputMode="decimal"`, focus on open); change = toMinor(received) − total,
 *    shown big as "Change <money>"; under the total → "Received is less than the amount due" and
 *    the submit disabled; empty received is allowed (exact money: change 0, `received` = total)
 * 4. card: "Receipt number" (required, trimmed, max 100); submit disabled while empty
 * 5. "Remarks" (optional textarea, max 500)
 * 6. "Take payment" → `onSubmit({ method, received (minor, cash only), reference (card only),
 *    remarks (trimmed, omitted when empty) })`; "Close" → `onClose`
 *
 * A taken payment (`payment` given):
 * 1. title "Payment · Order <n>"; read-only rows: method, amount, received and change (cash),
 *    receipt number (card), remarks, taken at (`createdAt`, date and time)
 * 2. "Void payment" opens a required reason (textarea, max 500); "Void" disabled until a reason →
 *    `onVoid(reason.trim())`; "Close" → `onClose`
 */
export const PaymentDialog: React.FC<PaymentDialogProps> = ({
  order,
  payment,
  busy,
  onSubmit,
  onVoid,
  onClose,
}) => {
  const currency = order.currency ?? 'QAR'
  const total = order.total ?? 0

  const [method, setMethod] = useState<'cash' | 'card'>('cash')
  const [receivedInput, setReceivedInput] = useState('')
  const [reference, setReference] = useState('')
  const [remarks, setRemarks] = useState('')

  const [voiding, setVoiding] = useState(false)
  const [voidReason, setVoidReason] = useState('')

  const receivedInputRef = useRef<HTMLInputElement>(null)
  const voidReasonRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (payment === null && method === 'cash') {
      receivedInputRef.current?.focus()
    }
  }, [payment, method])

  useEffect(() => {
    if (voiding) {
      voidReasonRef.current?.focus()
    }
  }, [voiding])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [busy, onClose])

  // Calculation for Cash
  const trimmedReceived = receivedInput.trim()
  let isReceivedValid = true
  let receivedMinor = total
  let changeMinor = 0
  let isUnderTotal = false

  if (trimmedReceived !== '') {
    const parsed = Number(trimmedReceived)
    if (isNaN(parsed) || parsed < 0) {
      isReceivedValid = false
    } else {
      receivedMinor = toMinor(parsed, currency)
      changeMinor = receivedMinor - total
      if (receivedMinor < total) {
        isUnderTotal = true
        isReceivedValid = false
      }
    }
  }

  const canSubmit = method === 'cash' ? isReceivedValid : reference.trim().length > 0

  const handleSubmit = () => {
    if (!canSubmit || busy) return
    const trimmedRemarks = remarks.trim()
    if (method === 'cash') {
      onSubmit({
        method: 'cash',
        received: receivedMinor,
        ...(trimmedRemarks ? { remarks: trimmedRemarks } : {}),
      })
    } else {
      onSubmit({
        method: 'card',
        reference: reference.trim(),
        ...(trimmedRemarks ? { remarks: trimmedRemarks } : {}),
      })
    }
  }

  const handleVoid = () => {
    const reason = voidReason.trim()
    if (!reason || busy) return
    onVoid(reason)
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
        aria-labelledby="payment-dialog-title"
        className="order-board__dialog"
      >
        <h2 id="payment-dialog-title">Payment · Order {order.orderNumber ?? order.id}</h2>

        <div className="order-board__dialog-content">
          {payment === null ? (
            <>
              <OrderDisplay order={order} />

              <div className="order-board__amount-due">
                <span>Amount due</span>
                <span>{formatMinor(total, currency, 'en')}</span>
              </div>

              <div className="order-board__methods" role="group" aria-label="Payment method">
                <Button
                  buttonStyle={method === 'cash' ? 'primary' : 'secondary'}
                  className="order-board__method"
                  aria-pressed={method === 'cash'}
                  disabled={busy}
                  margin={false}
                  onClick={() => setMethod('cash')}
                >
                  Cash
                </Button>
                <Button
                  buttonStyle={method === 'card' ? 'primary' : 'secondary'}
                  className="order-board__method"
                  aria-pressed={method === 'card'}
                  disabled={busy}
                  margin={false}
                  onClick={() => setMethod('card')}
                >
                  Card
                </Button>
              </div>

              {method === 'cash' ? (
                <>
                  <div className="order-board__dialog-field">
                    <label htmlFor="payment-received">Received</label>
                    <input
                      id="payment-received"
                      ref={receivedInputRef}
                      type="text"
                      inputMode="decimal"
                      value={receivedInput}
                      disabled={busy}
                      onChange={(e) => setReceivedInput(e.target.value)}
                      placeholder={formatMinor(total, currency, 'en')}
                    />
                  </div>

                  {isReceivedValid && (
                    <div className="order-board__change">
                      <span>Change</span>
                      <span>{formatMinor(changeMinor, currency, 'en')}</span>
                    </div>
                  )}

                  {isUnderTotal && (
                    <p className="order-board__field-error">
                      Received is less than the amount due
                    </p>
                  )}
                </>
              ) : (
                <div className="order-board__dialog-field">
                  <label htmlFor="payment-reference">Receipt number</label>
                  <input
                    id="payment-reference"
                    type="text"
                    maxLength={100}
                    value={reference}
                    disabled={busy}
                    onChange={(e) => setReference(e.target.value)}
                  />
                </div>
              )}

              <div className="order-board__dialog-field">
                <label htmlFor="payment-remarks">Remarks</label>
                <textarea
                  id="payment-remarks"
                  maxLength={500}
                  rows={2}
                  value={remarks}
                  disabled={busy}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>
            </>
          ) : (
            <>
              <dl className="order-board__payment-details">
                <dt>Method</dt>
                <dd>
                  {payment.method === 'cash'
                    ? 'Cash'
                    : payment.method === 'card'
                      ? 'Card'
                      : payment.method}
                </dd>

                <dt>Amount</dt>
                <dd>
                  {payment.amount !== null && payment.amount !== undefined
                    ? formatMinor(payment.amount, currency, 'en')
                    : ''}
                </dd>

                {payment.method === 'cash' && (
                  <>
                    <dt>Received</dt>
                    <dd>
                      {payment.received !== null && payment.received !== undefined
                        ? formatMinor(payment.received, currency, 'en')
                        : ''}
                    </dd>
                    <dt>Change</dt>
                    <dd>
                      {payment.change !== null && payment.change !== undefined
                        ? formatMinor(payment.change, currency, 'en')
                        : ''}
                    </dd>
                  </>
                )}

                {payment.method === 'card' && (
                  <>
                    <dt>Receipt number</dt>
                    <dd>{payment.reference ?? ''}</dd>
                  </>
                )}

                {payment.remarks && (
                  <>
                    <dt>Remarks</dt>
                    <dd>{payment.remarks}</dd>
                  </>
                )}

                <dt>Taken at</dt>
                <dd>
                  {payment.createdAt
                    ? new Date(payment.createdAt).toLocaleString('en', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })
                    : ''}
                </dd>
              </dl>

              {voiding && (
                <div className="order-board__dialog-field">
                  <label htmlFor="void-reason">Reason</label>
                  <textarea
                    id="void-reason"
                    ref={voidReasonRef}
                    maxLength={500}
                    rows={3}
                    value={voidReason}
                    disabled={busy}
                    onChange={(e) => setVoidReason(e.target.value)}
                    placeholder="e.g. Wrong method, Cash counted incorrectly…"
                  />
                </div>
              )}
            </>
          )}
        </div>

        <div className="order-board__dialog-actions">
          {payment === null ? (
            <>
              <Button
                buttonStyle="secondary"
                size="large"
                margin={false}
                disabled={busy}
                onClick={onClose}
              >
                Close
              </Button>
              <Button
                buttonStyle="primary"
                size="large"
                margin={false}
                disabled={!canSubmit || busy}
                onClick={handleSubmit}
              >
                Take payment
              </Button>
            </>
          ) : (
            <>
              <Button
                buttonStyle="secondary"
                size="large"
                margin={false}
                disabled={busy}
                onClick={onClose}
              >
                Close
              </Button>
              {voiding ? (
                <Button
                  buttonStyle="error"
                  size="large"
                  margin={false}
                  disabled={!voidReason.trim() || busy}
                  onClick={handleVoid}
                >
                  Void
                </Button>
              ) : (
                <Button
                  buttonStyle="secondary"
                  size="large"
                  margin={false}
                  disabled={busy}
                  onClick={() => setVoiding(true)}
                >
                  Void payment
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
