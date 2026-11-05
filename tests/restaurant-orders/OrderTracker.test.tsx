// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import {
  OrderTracker,
  type OrderTrackerProps,
} from '@/app/(frontend)/menu/_components/ordering/OrderTracker'
import { menuStrings } from '@/app/(frontend)/menu/_i18n'
import { DEFAULT_LEVEL, DEFAULT_TONE } from '@/common/components/AlertSounds/tones'
import type { AlertSound } from '@/common/components/AlertSounds/useAlertSound'
import type { BrowserNotifications } from '@/common/components/AlertSounds/useBrowserNotifications'
import type { GuestOrder, GuestOrderLine } from '@/common/utils/guestOrder'

// rem0018 phase 3 step 2b: the tracker sheet of one order. Renders <OrderTracker /> with a
// GuestOrder fixture (built here: status, lines with options, total, currency QAR); the actions
// module is mocked (vi.mock('@/app/(frontend)/menu/_actions/orders', …): the server boundary,
// as CartBar.test), sound / notifications are plain objects of vi.fn()s.

vi.mock('@/app/(frontend)/menu/_actions/orders', () => ({
  cancelOrderAction: vi.fn(),
  requestAssistanceAction: vi.fn(),
  payOnlineAction: vi.fn(),
}))

const createMockAlertSound = (): AlertSound => ({
  ready: true,
  enable: vi.fn(async () => {}),
  enabled: true,
  setEnabled: vi.fn(),
  level: DEFAULT_LEVEL,
  setLevel: vi.fn(),
  tone: DEFAULT_TONE,
  setTone: vi.fn(),
  vibrate: true,
  setVibrate: vi.fn(),
  loop: false,
  setLoop: vi.fn(),
  ringing: false,
  setRinging: vi.fn(),
  chimeWhenVisible: false,
  setChimeWhenVisible: vi.fn(),
  play: vi.fn(),
})

const createMockNotifications = (): BrowserNotifications => ({
  permission: 'default',
  requestPermission: vi.fn(async () => {}),
  notify: vi.fn(),
})

const createGuestOrder = (overrides: Partial<GuestOrder> = {}): GuestOrder => ({
  id: 1,
  orderNumber: 42,
  status: 'pending',
  paymentStatus: 'unpaid',
  table: '5',
  guestName: 'Guest',
  notes: null,
  lines: [],
  total: 4300,
  currency: 'QAR',
  showPrices: true,
  createdAt: '2026-11-04T10:00:00.000Z',
  assistanceRequestedAt: null,
  billRequestedAt: null,
  receipt: null,
  ...overrides,
})

const renderOrderTracker = (props: Partial<OrderTrackerProps> = {}) => {
  const defaultProps: OrderTrackerProps = {
    order: createGuestOrder(),
    token: 'test-token',
    live: true,
    locale: 'en',
    onlinePayment: false,
    sound: createMockAlertSound(),
    notifications: createMockNotifications(),
    onUpdate: vi.fn(),
    onClose: vi.fn(),
    ...props,
  }
  return render(<OrderTracker {...defaultProps} />)
}

describe('OrderTracker', () => {
  beforeAll(() => {
    if (typeof HTMLDialogElement !== 'undefined') {
      HTMLDialogElement.prototype.showModal ??= vi.fn(function (this: HTMLDialogElement) {
        this.setAttribute('open', '')
      })
      HTMLDialogElement.prototype.close ??= vi.fn(function (this: HTMLDialogElement) {
        this.removeAttribute('open')
      })
    }
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('shows each status step', () => {
    // arrange: an order at 'preparing'
    const t = menuStrings('en')
    const order = createGuestOrder({ status: 'preparing' })

    // act: render
    const { container } = renderOrderTracker({ order })

    // assert: the six step labels in order; pending, confirmed, preparing marked done;
    //         preparing has aria-current="step"
    const stepLabels = [
      t.statusPending,
      t.statusConfirmed,
      t.statusPreparing,
      t.statusPrepared,
      t.statusServed,
      t.statusCompleted,
    ]
    const steps = container.querySelectorAll('.menu-tracker-step')
    expect(Array.from(steps).map((el) => el.textContent?.trim())).toEqual(stepLabels)
    expect(steps[0]?.classList.contains('is-done')).toBe(true)
    expect(steps[1]?.classList.contains('is-done')).toBe(true)
    expect(steps[2]?.classList.contains('is-done')).toBe(true)
    expect(steps[2]?.classList.contains('is-active')).toBe(true)
    expect(steps[2]?.getAttribute('aria-current')).toBe('step')
    expect(steps[3]?.classList.contains('is-done')).toBe(false)
  })

  it('offers cancel only while pending', () => {
    // arrange: one pending order, one confirmed (rerender)
    const t = menuStrings('en')
    const pendingOrder = createGuestOrder({ status: 'pending' })
    const confirmedOrder = createGuestOrder({ status: 'confirmed' })

    // act: render each
    const { rerender } = renderOrderTracker({ order: pendingOrder })

    // assert: "Cancel order" for pending; none for confirmed
    expect(screen.getByRole('button', { name: t.cancelOrder })).toBeTruthy()

    rerender(
      <OrderTracker
        order={confirmedOrder}
        token="test-token"
        live={true}
        locale="en"
        onlinePayment={false}
        sound={createMockAlertSound()}
        notifications={createMockNotifications()}
        onUpdate={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(screen.queryByRole('button', { name: t.cancelOrder })).toBeNull()
  })

  it('offers pay now only with a provider', () => {
    // arrange: an unpaid order
    const t = menuStrings('en')
    const order = createGuestOrder({ paymentStatus: 'unpaid', total: 4300, currency: 'QAR' })

    // act: render with onlinePayment true, then false
    const { rerender } = renderOrderTracker({ order, onlinePayment: true })

    // assert: "Pay now" with a provider; without one only "Pay at the counter" and the total due
    expect(screen.getByRole('button', { name: t.payNow })).toBeTruthy()
    expect(screen.getByText(t.payAtCounter)).toBeTruthy()
    expect(screen.getByText(new RegExp(t.totalDue))).toBeTruthy()

    rerender(
      <OrderTracker
        order={order}
        token="test-token"
        live={true}
        locale="en"
        onlinePayment={false}
        sound={createMockAlertSound()}
        notifications={createMockNotifications()}
        onUpdate={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(screen.queryByRole('button', { name: t.payNow })).toBeNull()
    expect(screen.getByText(t.payAtCounter)).toBeTruthy()
    expect(screen.getByText(new RegExp(t.totalDue))).toBeTruthy()
  })

  it('shows the receipt once paid', () => {
    // arrange: a paid order with receipt { method: 'card', amount, paidAt }
    const t = menuStrings('en')
    const order = createGuestOrder({
      paymentStatus: 'paid',
      receipt: {
        method: 'card',
        amount: 4300,
        paidAt: '2026-11-04T10:15:00.000Z',
      },
    })

    // act: render
    renderOrderTracker({ order })

    // assert: "Receipt", "Paid by card" and the amount; no "Pay now" / "Pay at the counter"
    expect(screen.getByText(t.receipt)).toBeTruthy()
    const paidByCard = t.paidBy.replace('{method}', t.card)
    expect(screen.getByText(new RegExp(paidByCard))).toBeTruthy()
    expect(screen.getByText(new RegExp('43\\.00'))).toBeTruthy()
    expect(screen.queryByRole('button', { name: t.payNow })).toBeNull()
    expect(screen.queryByText(t.payAtCounter)).toBeNull()
  })

  it('shows the breakdown on the receipt', () => {
    // arrange: a paid order, a line Karak × 2 with Large +2.00 (unitPrice 5.00, lineTotal 10.00)
    const t = menuStrings('en')
    const line: GuestOrderLine = {
      title: 'Karak',
      quantity: 2,
      unitPrice: 500,
      lineTotal: 1000,
      options: [{ label: 'Large', price: 200 }],
    }
    const order = createGuestOrder({
      paymentStatus: 'paid',
      showPrices: true,
      currency: 'QAR',
      lines: [line],
      total: 1000,
      receipt: {
        method: 'card',
        amount: 1000,
        paidAt: '2026-11-04T10:15:00.000Z',
      },
    })

    // act: render
    const { container } = renderOrderTracker({ order })

    // assert: inside the receipt: base 3.00, "Large" + 2.00, line total 10.00
    expect(screen.getByText(t.receipt)).toBeTruthy()
    const receiptText =
      container.querySelector('.menu-receipt')?.textContent?.replace(/\s+/g, ' ') ?? ''
    expect(receiptText).toContain('3.00')
    expect(receiptText).toContain('Large')
    expect(receiptText).toContain('2.00')
    expect(receiptText).toContain('10.00')
  })

  it('renders right-to-left in arabic', () => {
    // arrange: a pending order, locale ar, inside <div dir="rtl">
    const tAr = menuStrings('ar')
    const order = createGuestOrder({ status: 'pending', total: 4300, currency: 'QAR' })

    // act: render
    const { container } = render(
      <div dir="rtl">
        <OrderTracker
          order={order}
          token="test-token"
          live={true}
          locale="ar"
          onlinePayment={false}
          sound={createMockAlertSound()}
          notifications={createMockNotifications()}
          onUpdate={vi.fn()}
          onClose={vi.fn()}
        />
      </div>,
    )

    // assert: the Arabic step and action labels (menuStrings('ar')); the amounts stay in
    //         <bdi dir="ltr">
    expect(screen.getByText(tAr.statusPending)).toBeTruthy()
    expect(screen.getByRole('button', { name: tAr.cancelOrder })).toBeTruthy()
    const bdi = container.querySelector('bdi')
    expect(bdi?.getAttribute('dir')).toBe('ltr')
  })

  it('shows reconnecting when the stream drops', () => {
    // arrange: a pending order
    const t = menuStrings('en')
    const order = createGuestOrder({ status: 'pending' })

    // act: render with live true, then rerender with live false
    const { rerender } = renderOrderTracker({ order, live: true })
    expect(screen.getByText(t.live)).toBeTruthy()

    rerender(
      <OrderTracker
        order={order}
        token="test-token"
        live={false}
        locale="en"
        onlinePayment={false}
        sound={createMockAlertSound()}
        notifications={createMockNotifications()}
        onUpdate={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    // assert: "Live", then "Reconnecting…"
    expect(screen.queryByText(t.live)).toBeNull()
    expect(screen.getByText(t.reconnecting)).toBeTruthy()
  })
})
