// @vitest-environment jsdom
// The cashier's Close order (rem0018 phase 4 step 2c,
// src/common/components/OrderBoard/CloseOrderDialog.tsx). `@payloadcms/ui` mocked (Button as a
// plain <button>). Fixtures built here: an order (number 12, served) unpaid or paid.
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  CLOSE_REASON_LABELS,
  CloseOrderDialog,
} from '@/common/components/OrderBoard/CloseOrderDialog'
import type { Order } from '@/payload-types'

vi.mock('@payloadcms/ui', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...rest
  }: {
    children?: React.ReactNode
    onClick?: React.MouseEventHandler<HTMLButtonElement>
    disabled?: boolean
    [key: string]: unknown
  }) => {
    const ariaProps: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(rest)) {
      if (key.startsWith('aria-')) {
        ariaProps[key] = val
      }
    }
    return (
      <button onClick={onClick} disabled={disabled} {...ariaProps}>
        {children}
      </button>
    )
  },
}))

const unpaidOrder: Order = {
  id: 12,
  orderNumber: 12,
  tenant: 1,
  orderDate: '2026-11-14',
  status: 'served',
  menu: 1,
  source: 'guest',
  type: 'dine_in',
  items: [
    {
      id: 'line-1',
      item: 1,
      title: 'Burger',
      quantity: 1,
      unitPrice: 4300,
      lineTotal: 4300,
    },
  ],
  subtotal: 4300,
  total: 4300,
  currency: 'QAR',
  flow: 'waiter_kitchen_cashier',
  paymentStatus: 'unpaid',
  createdAt: '2026-11-14T12:00:00.000Z',
  updatedAt: '2026-11-14T12:00:00.000Z',
}

const paidOrder: Order = {
  ...unpaidOrder,
  paymentStatus: 'paid',
}

describe('CloseOrderDialog', () => {
  afterEach(() => {
    cleanup()
  })

  it('requires a reason to close without payment', () => {
    // arrange: the unpaid order
    // act: render
    // assert: "Close order" disabled; pick "Guest walked out" → enabled; click → onConfirm with
    //         { outcome: 'unpaid', reason: 'walked_out' }
    const onConfirm = vi.fn()
    const onClose = vi.fn()
    render(<CloseOrderDialog order={unpaidOrder} onConfirm={onConfirm} onClose={onClose} />)
    const closeBtn = screen.getByRole('button', { name: 'Close order' })
    expect(closeBtn).toHaveProperty('disabled', true)
    fireEvent.click(screen.getByRole('radio', { name: CLOSE_REASON_LABELS.walked_out }))
    expect(closeBtn).toHaveProperty('disabled', false)
    fireEvent.click(closeBtn)
    expect(onConfirm).toHaveBeenCalledWith({ outcome: 'unpaid', reason: 'walked_out' })
  })

  it('asks for a note when the reason is other', () => {
    // arrange: the unpaid order
    // act: pick "Other"
    // assert: "Close order" disabled until "Note" has text; type "Owner's friend" → click →
    //         onConfirm with { outcome: 'unpaid', reason: 'other', note: "Owner's friend" }
    const onConfirm = vi.fn()
    const onClose = vi.fn()
    render(<CloseOrderDialog order={unpaidOrder} onConfirm={onConfirm} onClose={onClose} />)
    fireEvent.click(screen.getByRole('radio', { name: CLOSE_REASON_LABELS.other }))
    const closeBtn = screen.getByRole('button', { name: 'Close order' })
    expect(closeBtn).toHaveProperty('disabled', true)
    fireEvent.change(screen.getByLabelText('Note'), { target: { value: "Owner's friend" } })
    expect(closeBtn).toHaveProperty('disabled', false)
    fireEvent.click(closeBtn)
    expect(onConfirm).toHaveBeenCalledWith({
      outcome: 'unpaid',
      reason: 'other',
      note: "Owner's friend",
    })
  })

  it('closes a paid order without a reason', () => {
    // arrange: the paid order
    // act: render, click "Close order"
    // assert: no reasons shown; onConfirm with { outcome: 'paid' }
    const onConfirm = vi.fn()
    const onClose = vi.fn()
    render(<CloseOrderDialog order={paidOrder} onConfirm={onConfirm} onClose={onClose} />)
    const closeBtn = screen.getByRole('button', { name: 'Close order' })
    fireEvent.click(closeBtn)
    expect(screen.queryByRole('radio')).toBeNull()
    expect(onConfirm).toHaveBeenCalledWith({ outcome: 'paid' })
  })
})
