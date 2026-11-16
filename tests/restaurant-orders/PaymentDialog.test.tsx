// @vitest-environment jsdom
// The cashier's payment dialog (rem0018 phase 4 step 2c,
// src/common/components/OrderBoard/PaymentDialog.tsx). `@payloadcms/ui` mocked (Button as a plain
// <button>, as OrderBoard.test). Fixtures built here: an order (number 12, total 4300 QAR, one
// line) and a succeeded cash payment for it.
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PaymentDialog } from '@/common/components/OrderBoard/PaymentDialog'
import { formatMinor } from '@/common/utils/money'
import type { Order, Payment } from '@/payload-types'

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

const orderFixture: Order = {
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

const paymentFixture: Payment = {
  id: 1,
  tenant: 1,
  order: 12,
  method: 'cash',
  status: 'succeeded',
  amount: 4300,
  received: 5000,
  change: 700,
  currency: 'QAR',
  remarks: 'Tip kept',
  createdAt: '2026-11-14T12:05:00.000Z',
  updatedAt: '2026-11-14T12:05:00.000Z',
}

// Intl puts a no-break space in money text; Testing Library collapses it to a plain space on the page
const money = (minor: number): string => formatMinor(minor, 'QAR', 'en').replace(/\s/g, ' ')

describe('PaymentDialog', () => {
  afterEach(() => {
    cleanup()
  })

  describe('take payment', () => {
    it('shows the change for cash', () => {
      // arrange: the order (total 43.00 QAR), payment null
      // act: Cash is picked; type 50 in "Received"
      // assert: the change reads 7.00 (formatMinor 700 QAR); "Take payment" → onSubmit with
      //         { method: 'cash', received: 5000 }
      const onSubmit = vi.fn()
      const onVoid = vi.fn()
      const onClose = vi.fn()
      render(
        <PaymentDialog
          order={orderFixture}
          payment={null}
          onSubmit={onSubmit}
          onVoid={onVoid}
          onClose={onClose}
        />,
      )
      fireEvent.change(screen.getByLabelText('Received'), { target: { value: '50' } })
      expect(screen.getByText(money(700), { exact: false })).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: 'Take payment' }))
      expect(onSubmit).toHaveBeenCalledWith({ method: 'cash', received: 5000 })
    })

    it('requires a receipt number for card', () => {
      // arrange: the order, payment null
      // act: pick Card
      // assert: "Take payment" disabled; type "R-77" → enabled; click → onSubmit with
      //         { method: 'card', reference: 'R-77' } (no received)
      const onSubmit = vi.fn()
      const onVoid = vi.fn()
      const onClose = vi.fn()
      render(
        <PaymentDialog
          order={orderFixture}
          payment={null}
          onSubmit={onSubmit}
          onVoid={onVoid}
          onClose={onClose}
        />,
      )
      fireEvent.click(screen.getByRole('button', { name: 'Card' }))
      const submitBtn = screen.getByRole('button', { name: 'Take payment' })
      expect(submitBtn).toHaveProperty('disabled', true)
      fireEvent.change(screen.getByLabelText('Receipt number'), { target: { value: 'R-77' } })
      expect(submitBtn).toHaveProperty('disabled', false)
      fireEvent.click(submitBtn)
      expect(onSubmit).toHaveBeenCalledWith({ method: 'card', reference: 'R-77' })
    })

    it('charges the order total', () => {
      // arrange: the order (total 4300 QAR)
      // act: render
      // assert: "Amount due" shows formatMinor(4300, 'QAR', 'en'); there is no amount input
      //         (only Received, and Receipt number once Card is picked)
      const onSubmit = vi.fn()
      const onVoid = vi.fn()
      const onClose = vi.fn()
      render(
        <PaymentDialog
          order={orderFixture}
          payment={null}
          onSubmit={onSubmit}
          onVoid={onVoid}
          onClose={onClose}
        />,
      )
      expect(screen.getByText('Amount due').parentElement?.textContent).toContain(
        formatMinor(4300, 'QAR', 'en'),
      )
      expect(screen.queryByLabelText(/amount/i)).toBeNull()
      expect(screen.getByLabelText('Received')).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: 'Card' }))
      expect(screen.getByLabelText('Receipt number')).toBeTruthy()
      expect(screen.queryByLabelText(/amount/i)).toBeNull()
    })
  })

  describe('a taken payment', () => {
    it('shows a taken payment read only', () => {
      // arrange: the order and its cash payment (received 5000, change 700, remarks "Tip kept")
      // act: render with that payment
      // assert: method Cash, received and change, remarks shown; no Received input, no
      //         "Take payment"
      const onSubmit = vi.fn()
      const onVoid = vi.fn()
      const onClose = vi.fn()
      render(
        <PaymentDialog
          order={orderFixture}
          payment={paymentFixture}
          onSubmit={onSubmit}
          onVoid={onVoid}
          onClose={onClose}
        />,
      )
      expect(screen.getByText(/Cash/i)).toBeTruthy()
      expect(screen.getByText(money(5000), { exact: false })).toBeTruthy()
      expect(screen.getByText(money(700), { exact: false })).toBeTruthy()
      expect(screen.getByText('Tip kept', { exact: false })).toBeTruthy()
      expect(screen.queryByLabelText('Received')).toBeNull()
      expect(screen.queryByRole('button', { name: 'Take payment' })).toBeNull()
    })

    it('requires a reason to void', () => {
      // arrange: the order and its payment
      // act: click "Void payment"
      // assert: "Void" disabled; type "Wrong method" → click → onVoid('Wrong method')
      const onSubmit = vi.fn()
      const onVoid = vi.fn()
      const onClose = vi.fn()
      render(
        <PaymentDialog
          order={orderFixture}
          payment={paymentFixture}
          onSubmit={onSubmit}
          onVoid={onVoid}
          onClose={onClose}
        />,
      )
      fireEvent.click(screen.getByRole('button', { name: 'Void payment' }))
      const voidBtn = screen.getByRole('button', { name: 'Void' })
      expect(voidBtn).toHaveProperty('disabled', true)
      fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Wrong method' } })
      expect(voidBtn).toHaveProperty('disabled', false)
      fireEvent.click(voidBtn)
      expect(onVoid).toHaveBeenCalledWith('Wrong method')
    })
  })
})
