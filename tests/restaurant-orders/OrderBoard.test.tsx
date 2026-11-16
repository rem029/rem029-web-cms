// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { BoardContext } from '@/collections/Orders/utils/board'
import { playTone } from '@/common/components/AlertSounds/tones'
import { OrderBoard } from '@/common/components/OrderBoard'
import {
  clearAssistanceAction,
  closeOrderAction,
  getBoardContextAction,
  getOrderPaymentAction,
  listBoardOrdersAction,
  moveOrderAction,
  recordPaymentAction,
} from '@/common/components/OrderBoard/actions'
import type { Order } from '@/payload-types'

import { FakeAudioContext } from '../common/audio'

// rem0018 phase 4 step 2a: a staff board. Renders <OrderBoard role tenantId /> from
// src/common/components/OrderBoard; the actions module is mocked
// (vi.mock('@/common/components/OrderBoard/actions', …): the server boundary, as
// OrderTracker.test), `@payloadcms/ui` mocked (Button as a plain <button>), a FakeEventSource on
// globalThis (as useOrderTracking.test: records its url, the test fires open / error / `order`
// frames, `giveUp()` closes it for good). Fixtures built here: a BoardContext (tenant 1, user 7,
// one menu flow `waiter_kitchen_cashier` with prices on, today '2026-11-05') and `makeOrder(status,
// overrides)` (order number, table, one line with an add-on, total, currency QAR).
// localStorage cleared after each test.

vi.mock('@/common/components/OrderBoard/actions', () => ({
  getBoardRolesAction: vi.fn(),
  getBoardContextAction: vi.fn(),
  getOrderPaymentAction: vi.fn(),
  listBoardOrdersAction: vi.fn(),
  listRefundDueAction: vi.fn(),
  moveOrderAction: vi.fn(),
  clearAssistanceAction: vi.fn(),
  recordPaymentAction: vi.fn(),
  voidPaymentAction: vi.fn(),
  closeOrderAction: vi.fn(),
}))

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

class FakeEventSource {
  static readonly CLOSED = 2
  static instances: FakeEventSource[] = []
  url: string
  readyState = 0
  onopen: ((event: Event) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  closed = false
  private listeners = new Map<string, Set<(event: Event) => void>>()

  constructor(url: string | URL) {
    this.url = String(url)
    FakeEventSource.instances.push(this)
  }

  addEventListener(type: string, listener: (event: Event) => void): void {
    const set = this.listeners.get(type) ?? new Set()
    set.add(listener)
    this.listeners.set(type, set)
  }

  removeEventListener(type: string, listener: (event: Event) => void): void {
    this.listeners.get(type)?.delete(listener)
  }

  close(): void {
    this.closed = true
    this.readyState = FakeEventSource.CLOSED
  }

  // a non-200 answer (a proxy 502 during a restart): the browser closes for good, then errors
  giveUp(): void {
    this.readyState = FakeEventSource.CLOSED
    this.onerror?.(new Event('error'))
  }

  emit(type: string, data: unknown): void {
    const event = new MessageEvent(type, { data: JSON.stringify(data) })
    const set = this.listeners.get(type)
    if (set) {
      for (const listener of set) {
        listener(event)
      }
    }
  }
}

const makeOrder = (status: Order['status'] = 'pending', overrides: Partial<Order> = {}): Order => ({
  id: 1,
  tenant: 1,
  orderNumber: 23,
  orderDate: '2026-11-05',
  status,
  menu: 1,
  source: 'guest',
  type: 'dine_in',
  table: 1,
  guestName: 'Guest',
  items: [
    {
      id: 'line-1',
      item: 10,
      title: 'Burger',
      quantity: 1,
      unitPrice: 5000,
      lineTotal: 5500,
      selectedOptions: [
        {
          id: 'opt-1',
          option: 'cheese',
          group: 'Add-ons',
          label: 'Cheese',
          price: 500,
        },
      ],
    },
  ],
  subtotal: 5000,
  total: 5500,
  currency: 'QAR',
  flow: 'waiter_kitchen_cashier',
  showPrices: true,
  paymentStatus: 'unpaid',
  createdAt: '2026-11-05T12:00:00.000Z',
  updatedAt: '2026-11-05T12:00:00.000Z',
  ...overrides,
})

const makeContext = (overrides: Partial<BoardContext> = {}): BoardContext => ({
  tenantId: 1,
  userId: 7,
  isManager: false,
  roles: ['waiter', 'kitchen', 'cashier'],
  menus: [
    {
      id: 1,
      title: 'Main Menu',
      flow: 'waiter_kitchen_cashier',
      showPrices: true,
    },
  ],
  today: '2026-11-05',
  ...overrides,
})

describe('OrderBoard', () => {
  beforeEach(() => {
    FakeEventSource.instances = []
    vi.stubGlobal('EventSource', FakeEventSource)
    FakeAudioContext.instances = []
    FakeAudioContext.createdOscillators = []
    vi.stubGlobal('AudioContext', FakeAudioContext)
    localStorage.clear()
    vi.clearAllMocks()
    vi.mocked(getBoardContextAction).mockResolvedValue({
      ok: true,
      data: makeContext(),
    })
    vi.mocked(listBoardOrdersAction).mockResolvedValue({
      ok: true,
      data: {
        orders: [],
        page: 1,
        totalPages: 1,
      },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    cleanup()
    localStorage.clear()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('shows only the buttons the role owns', async () => {
    // arrange: role kitchen; listBoardOrdersAction answers a `confirmed` order
    const order = makeOrder('confirmed')
    vi.mocked(listBoardOrdersAction).mockResolvedValue({
      ok: true,
      data: { orders: [order], page: 1, totalPages: 1 },
    })

    // act: render
    render(<OrderBoard role="kitchen" tenantId={1} />)

    // assert: "Start preparing" shown; no "Confirm", no "Serve", no "Take payment"
    expect(await screen.findByRole('button', { name: 'Start preparing' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Confirm' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Serve' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Take payment' })).toBeNull()
  })

  it('adds a new order from the stream', async () => {
    // arrange: role waiter, list empty; render; the stream opens
    vi.mocked(listBoardOrdersAction).mockResolvedValue({
      ok: true,
      data: { orders: [], page: 1, totalPages: 1 },
    })
    render(<OrderBoard role="waiter" tenantId={1} />)
    await waitFor(() => {
      expect(FakeEventSource.instances.length).toBeGreaterThan(0)
    })
    const source = FakeEventSource.instances[0]
    if (!source) throw new Error('Expected EventSource instance')
    source.onopen?.(new Event('open'))

    // act: an `order` frame { type: 'created', order: makeOrder('pending') }
    source.emit('order', { type: 'created', order: makeOrder('pending') })

    // assert: its card ("Order 23") shows
    expect(await screen.findByText(/Order 23/)).toBeTruthy()
  })

  it('drops an order that moves off the board', async () => {
    // arrange: role kitchen, a `prepared` order listed
    const order = makeOrder('prepared')
    vi.mocked(listBoardOrdersAction).mockResolvedValue({
      ok: true,
      data: { orders: [order], page: 1, totalPages: 1 },
    })
    render(<OrderBoard role="kitchen" tenantId={1} />)
    expect(await screen.findByText(/Order 23/)).toBeTruthy()
    await waitFor(() => {
      expect(FakeEventSource.instances.length).toBeGreaterThan(0)
    })
    const source = FakeEventSource.instances[0]
    if (!source) throw new Error('Expected EventSource instance')
    source.onopen?.(new Event('open'))

    // act: an `order` frame with that order `served`
    source.emit('order', { type: 'updated', order: { ...order, status: 'served' } })

    // assert: the card is gone
    await waitFor(() => {
      expect(screen.queryByText(/Order 23/)).toBeNull()
    })
  })

  it('undoes the last move', async () => {
    // arrange: role kitchen, a `confirmed` order; moveOrderAction answers it `preparing`, then
    //          `confirmed`
    const order = makeOrder('confirmed')
    vi.mocked(listBoardOrdersAction).mockResolvedValue({
      ok: true,
      data: { orders: [order], page: 1, totalPages: 1 },
    })
    vi.mocked(moveOrderAction)
      .mockResolvedValueOnce({
        ok: true,
        data: { ...order, status: 'preparing' },
      })
      .mockResolvedValueOnce({
        ok: true,
        data: { ...order, status: 'confirmed' },
      })
    render(<OrderBoard role="kitchen" tenantId={1} />)

    // act: press "Start preparing", then "Undo" in the toast
    const startBtn = await screen.findByRole('button', { name: 'Start preparing' })
    fireEvent.click(startBtn)
    const undoBtn = await screen.findByRole('button', { name: 'Undo' })
    fireEvent.click(undoBtn)

    // assert: moveOrderAction called with { status: 'preparing' }, then { status: 'confirmed' }
    await waitFor(() => {
      expect(moveOrderAction).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ orderId: order.id, status: 'preparing' }),
      )
      expect(moveOrderAction).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ orderId: order.id, status: 'confirmed' }),
      )
    })
  })

  it('offers move back on an open order', async () => {
    // arrange: role kitchen, a `prepared` order
    const order = makeOrder('prepared')
    vi.mocked(listBoardOrdersAction).mockResolvedValue({
      ok: true,
      data: { orders: [order], page: 1, totalPages: 1 },
    })
    vi.mocked(moveOrderAction).mockResolvedValue({
      ok: true,
      data: { ...order, status: 'preparing' },
    })

    // act: render
    render(<OrderBoard role="kitchen" tenantId={1} />)

    // assert: a "Move back" button; pressing it calls moveOrderAction with { status: 'preparing' }
    const backBtn = await screen.findByRole('button', { name: 'Move back' })
    expect(backBtn).toBeTruthy()
    fireEvent.click(backBtn)
    await waitFor(() => {
      expect(moveOrderAction).toHaveBeenCalledWith(
        expect.objectContaining({ orderId: order.id, status: 'preparing' }),
      )
    })
  })

  it('asks for confirmation before cancelling', async () => {
    // arrange: role waiter, a `pending` order
    const order = makeOrder('pending')
    vi.mocked(listBoardOrdersAction).mockResolvedValue({
      ok: true,
      data: { orders: [order], page: 1, totalPages: 1 },
    })
    vi.mocked(moveOrderAction).mockResolvedValue({
      ok: true,
      data: { ...order, status: 'cancelled', cancelReason: 'Guest changed mind' },
    })
    render(<OrderBoard role="waiter" tenantId={1} />)

    // act: press "Cancel"; type a reason; press "Cancel order"
    const cancelBtn = await screen.findByRole('button', { name: 'Cancel' })
    fireEvent.click(cancelBtn)
    expect(moveOrderAction).not.toHaveBeenCalled()
    const reasonInput = await screen.findByRole('textbox')
    fireEvent.change(reasonInput, { target: { value: 'Guest changed mind' } })
    const confirmBtn = screen.getByRole('button', { name: 'Cancel order' })
    fireEvent.click(confirmBtn)

    // assert: no moveOrderAction before the dialog's confirm; then called with
    //         { status: 'cancelled', cancelReason: <the reason> }
    await waitFor(() => {
      expect(moveOrderAction).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: order.id,
          status: 'cancelled',
          cancelReason: 'Guest changed mind',
        }),
      )
    })
  })

  it.each([
    { role: 'waiter' as const, hasCancel: false },
    { role: 'cashier' as const, hasCancel: false },
    { role: 'kitchen' as const, hasCancel: true },
  ])('hides cancel from waiters and cashiers once preparing ()', async ({ role, hasCancel }) => {
    // arrange: a `preparing` order
    vi.mocked(listBoardOrdersAction).mockResolvedValue({
      ok: true,
      data: { orders: [makeOrder('preparing')], page: 1, totalPages: 1 },
    })

    // act: render as the role
    render(<OrderBoard role={role} tenantId={1} />)
    await screen.findByText(/Order 23/)

    // assert: a "Cancel" button only for the kitchen
    expect(screen.queryByRole('button', { name: 'Cancel' }) !== null).toBe(hasCancel)
  })

  it('hides prices when the order hides them', async () => {
    // arrange: role waiter, a `pending` order with showPrices false
    const order = makeOrder('pending', { showPrices: false })
    vi.mocked(listBoardOrdersAction).mockResolvedValue({
      ok: true,
      data: { orders: [order], page: 1, totalPages: 1 },
    })

    // act: render
    render(<OrderBoard role="waiter" tenantId={1} />)

    // assert: no amount text ("QAR") on the card
    expect(await screen.findByText(/Order 23/)).toBeTruthy()
    expect(screen.queryByText(/QAR/)).toBeNull()
  })

  it('shows a badge when the guest asks for the bill', async () => {
    // arrange: role cashier, a `served` order with billRequestedAt set
    const order = makeOrder('served', { billRequestedAt: '2026-11-05T12:00:00.000Z' })
    vi.mocked(listBoardOrdersAction).mockResolvedValue({
      ok: true,
      data: { orders: [order], page: 1, totalPages: 1 },
    })
    vi.mocked(clearAssistanceAction).mockResolvedValue({
      ok: true,
      data: { ...order, billRequestedAt: null },
    })

    // act: render; press the badge's "Done"
    render(<OrderBoard role="cashier" tenantId={1} />)
    const badge = await screen.findByText('Bill asked for')
    expect(badge).toBeTruthy()
    const doneBtn = screen.getByRole('button', { name: 'Done' })
    fireEvent.click(doneBtn)

    // assert: "Bill asked for" shown; clearAssistanceAction called with { kind: 'bill' }
    await waitFor(() => {
      expect(clearAssistanceAction).toHaveBeenCalledWith(
        expect.objectContaining({ orderId: order.id, kind: 'bill' }),
      )
    })
  })

  it('refetches orders when the stream reopens', async () => {
    // arrange: role waiter; render; the stream opens (one list call after mount + open)
    render(<OrderBoard role="waiter" tenantId={1} />)
    await waitFor(() => {
      expect(FakeEventSource.instances.length).toBeGreaterThan(0)
    })
    const source = FakeEventSource.instances[0]
    if (!source) throw new Error('Expected EventSource instance')
    source.onopen?.(new Event('open'))
    await waitFor(() => {
      expect(listBoardOrdersAction).toHaveBeenCalledTimes(1)
    })

    // act: error, then open again
    const callsBefore = vi.mocked(listBoardOrdersAction).mock.calls.length
    source.onerror?.(new Event('error'))
    source.onopen?.(new Event('open'))

    // assert: listBoardOrdersAction called once more
    await waitFor(() => {
      expect(listBoardOrdersAction).toHaveBeenCalledTimes(callsBefore + 1)
    })
  })

  it('offers force reconnect when disconnected', async () => {
    // arrange: role waiter; render; the stream opens, then gives up (readyState CLOSED)
    render(<OrderBoard role="waiter" tenantId={1} />)
    await waitFor(() => {
      expect(FakeEventSource.instances.length).toBe(1)
    })
    const first = FakeEventSource.instances[0]
    if (!first) throw new Error('Expected EventSource instance')
    first.onopen?.(new Event('open'))
    first.giveUp()

    // act: press "Force reconnect"
    expect(await screen.findByText('Disconnected')).toBeTruthy()
    const reconnectBtn = screen.getByRole('button', { name: 'Force reconnect' })
    fireEvent.click(reconnectBtn)

    // assert: "Disconnected" shown before; a second EventSource on the same url after
    await waitFor(() => {
      expect(FakeEventSource.instances.length).toBe(2)
      expect(FakeEventSource.instances[1]?.url).toBe(first.url)
    })
  })

  it('keeps board settings per user and business', async () => {
    // arrange: context with two menus; render as user 7 / tenant 1, pick the second menu and the
    //          History tab; cleanup
    const menus = [
      { id: 1, title: 'Menu 1', flow: 'waiter_kitchen_cashier' as const, showPrices: true },
      { id: 2, title: 'Menu 2', flow: 'waiter_kitchen_cashier' as const, showPrices: true },
    ]
    const user7Context = makeContext({ userId: 7, tenantId: 1, menus })
    const user8Context = makeContext({ userId: 8, tenantId: 1, menus })

    vi.mocked(getBoardContextAction).mockResolvedValue({ ok: true, data: user7Context })
    const { unmount: unmount1 } = render(<OrderBoard role="waiter" tenantId={1} />)

    const menuSelect1 = await screen.findByRole('combobox')
    fireEvent.change(menuSelect1, { target: { value: '2' } })
    const historyTab = await screen.findByRole('button', { name: 'History' })
    fireEvent.click(historyTab)

    unmount1()
    cleanup()

    // act: render again as user 7 / tenant 1, then (cleanup) as user 8 / tenant 1
    vi.mocked(getBoardContextAction).mockResolvedValue({ ok: true, data: user7Context })
    const { unmount: unmount2 } = render(<OrderBoard role="waiter" tenantId={1} />)

    // assert: user 7 gets the second menu and History back; user 8 starts on All menus, Active
    const menuSelect7 = await screen.findByRole('combobox')
    // the settings are read after mount: wait for them
    await waitFor(() => {
      expect(menuSelect7 instanceof HTMLSelectElement && menuSelect7.value).toBe('2')
    })
    await waitFor(() => {
      expect(listBoardOrdersAction).toHaveBeenCalledWith(
        expect.objectContaining({ list: 'history', menuId: 2 }),
      )
    })

    unmount2()
    cleanup()

    vi.mocked(getBoardContextAction).mockResolvedValue({ ok: true, data: user8Context })
    render(<OrderBoard role="waiter" tenantId={1} />)

    const menuSelect8 = await screen.findByRole('combobox')
    expect(
      menuSelect8 instanceof HTMLSelectElement &&
        (menuSelect8.value === '' || menuSelect8.value === 'all'),
    ).toBe(true)
    await waitFor(() => {
      expect(listBoardOrdersAction).toHaveBeenCalledWith(
        expect.objectContaining({ list: 'active' }),
      )
    })
  })

  it('shows the refusal message from a failed move', async () => {
    // arrange: role kitchen, a `confirmed` order; moveOrderAction answers
    //          { ok: false, status: 403, message: 'Only the kitchen can …' }
    const order = makeOrder('confirmed')
    vi.mocked(listBoardOrdersAction).mockResolvedValue({
      ok: true,
      data: { orders: [order], page: 1, totalPages: 1 },
    })
    vi.mocked(moveOrderAction).mockResolvedValue({
      ok: false,
      status: 403,
      message: 'Only the kitchen can start preparing this order',
    })
    render(<OrderBoard role="kitchen" tenantId={1} />)

    // act: press "Start preparing"
    const startBtn = await screen.findByRole('button', { name: 'Start preparing' })
    fireEvent.click(startBtn)

    // assert: the message in a role="alert"; the list refetched
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Only the kitchen can start preparing this order')
    await waitFor(() => {
      expect(listBoardOrdersAction).toHaveBeenCalledTimes(2)
    })
  })

  // step 2b: card details (raised at the 2a review, okayed by the user 2026-11-07)

  it('shows the base price and each add-on', async () => {
    // arrange: role waiter; listBoardOrdersAction answers makeOrder('pending') (Burger, unitPrice
    // 5000, Cheese +500, quantity 2, lineTotal 11000)
    const order = makeOrder('pending', {
      items: [
        {
          id: 'line-1',
          item: 10,
          title: 'Burger',
          quantity: 2,
          unitPrice: 5000,
          lineTotal: 11000,
          selectedOptions: [
            {
              id: 'opt-1',
              option: 'cheese',
              group: 'Add-ons',
              label: 'Cheese',
              price: 500,
            },
          ],
        },
      ],
      total: 11000,
    })
    vi.mocked(listBoardOrdersAction).mockResolvedValue({
      ok: true,
      data: { orders: [order], page: 1, totalPages: 1 },
    })

    // act: render, wait for the card
    render(<OrderBoard role="waiter" tenantId={1} />)
    await screen.findByText(/Order 23/)

    // assert: the line reads "2 × Burger" with QAR 110.00; under it "Base" QAR 50.00 and
    // "Cheese" + QAR 5.00 (never the base minus the add-ons)
    expect(screen.getByText('2 × Burger')).toBeTruthy()
    expect(screen.getAllByText('QAR 110.00').length).toBeGreaterThan(0)
    expect(screen.getByText('Base')).toBeTruthy()
    expect(screen.getByText('QAR 50.00')).toBeTruthy()
    expect(screen.getByText('Cheese')).toBeTruthy()
    expect(screen.getByText('+ QAR 5.00')).toBeTruthy()
    expect(screen.queryByText('QAR 45.00')).toBeNull()
  })

  it('shows the date for an order from an earlier day', async () => {
    // arrange: fake timers at 2026-11-05T12:00Z; one order createdAt 2026-11-03T18:46:00Z, one
    // createdAt 2026-11-05T11:48:00Z
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-11-05T12:00:00.000Z'))

    const order1 = makeOrder('pending', {
      id: 1,
      orderNumber: 1,
      createdAt: '2026-11-03T18:46:00.000Z',
    })
    const order2 = makeOrder('pending', {
      id: 2,
      orderNumber: 2,
      createdAt: '2026-11-05T11:48:00.000Z',
    })
    vi.mocked(listBoardOrdersAction).mockResolvedValue({
      ok: true,
      data: { orders: [order1, order2], page: 1, totalPages: 1 },
    })

    // act: render
    render(<OrderBoard role="waiter" tenantId={1} />)
    await screen.findByText(/Order 1/)
    await screen.findByText(/Order 2/)

    // assert: the first card shows "Nov 3, 18:46" (en, 24 h; TZ is UTC in the test run) and the
    // second "12 min ago"
    expect(screen.getByText('Nov 3, 18:46')).toBeTruthy()
    expect(screen.getByText('12 min ago')).toBeTruthy()
  })

  it('says which list is empty', async () => {
    // arrange: role cashier; listBoardOrdersAction answers no orders
    vi.mocked(listBoardOrdersAction).mockResolvedValue({
      ok: true,
      data: { orders: [], page: 1, totalPages: 1 },
    })

    // act: render, then click History, then Unpaid
    render(<OrderBoard role="cashier" tenantId={1} />)

    // assert: "No orders waiting" on Active, "No orders on this day" on History, "No unpaid
    // orders" on Unpaid
    expect(await screen.findByText('No orders waiting')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'History' }))
    expect(await screen.findByText('No orders on this day')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Unpaid' }))
    expect(await screen.findByText('No unpaid orders')).toBeTruthy()
  })

  it('counts up the time since the request', async () => {
    // arrange: fake timers at 2026-11-05T12:00Z; an order with assistanceRequestedAt =
    // 2026-11-05T12:00:00Z
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-11-05T12:00:00.000Z'))

    const order = makeOrder('pending', {
      assistanceRequestedAt: '2026-11-05T12:00:00.000Z',
    })
    vi.mocked(listBoardOrdersAction).mockResolvedValue({
      ok: true,
      data: { orders: [order], page: 1, totalPages: 1 },
    })

    // act: render ("Staff called · just now"), advance the clock 5 minutes
    render(<OrderBoard role="waiter" tenantId={1} />)
    const badge = await screen.findByRole('status')
    expect(badge.textContent).toContain('Staff called · just now')
    // let React run the badge's effects (its clock starts there) before moving the clock
    await act(async () => {})

    await act(async () => {
      vi.advanceTimersByTime(5 * 60 * 1000)
    })

    // assert: the badge reads "Staff called · 5 min ago" without a new render from the test
    expect(badge.textContent).toContain('Staff called · 5 min ago')
  })

  it('keeps an order that arrives while the list loads', async () => {
    // arrange: role waiter; render; the stream opens, and its refetch answers only once the test
    // says so (a list the server read before the new order)
    render(<OrderBoard role="waiter" tenantId={1} />)
    await screen.findByText('No orders waiting')
    let answer: (value: Awaited<ReturnType<typeof listBoardOrdersAction>>) => void = () => {}
    vi.mocked(listBoardOrdersAction).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          answer = resolve
        }),
    )
    FakeEventSource.instances[0]?.onopen?.(new Event('open'))
    await waitFor(() => {
      expect(listBoardOrdersAction).toHaveBeenCalledTimes(2)
    })

    // act: a 'created' frame for order 31, then the refetch answers an empty list
    FakeEventSource.instances[0]?.emit('order', {
      type: 'created',
      order: makeOrder('pending', { id: 31, orderNumber: 31 }),
    })
    await act(async () => {
      answer({ ok: true, data: { orders: [], page: 1, totalPages: 1 } })
    })

    // assert: order 31 is still on the board
    expect(screen.getByText('Order 31')).toBeTruthy()
  })

  // step 2b: alerts. AudioContext = FakeAudioContext (tests/common/audio.ts, reset in beforeEach);
  // the board's sound scope is '7:1:<role>' (user 7, tenant 1), settings in localStorage under
  // 'orders-notify:7:1:<role>:<name>'

  it('asks to turn on sound before ringing', async () => {
    // arrange: role waiter, nothing in localStorage
    // act: render
    render(<OrderBoard role="waiter" tenantId={1} />)

    // assert: "Turn on sound" is shown; after clicking it, it's gone and an AudioContext exists
    const turnOnBtn = await screen.findByRole('button', { name: 'Turn on sound' })
    expect(turnOnBtn).toBeTruthy()
    fireEvent.click(turnOnBtn)
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Turn on sound' })).toBeNull()
      expect(FakeAudioContext.instances.length).toBeGreaterThan(0)
    })
  })

  it('rings until the new order is handled', async () => {
    // arrange: fake timers; role waiter; render and click "Turn on sound"; the stream opens
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const now = '2026-11-05T12:00:00.000Z'
    vi.setSystemTime(new Date(now))

    render(<OrderBoard role="waiter" tenantId={1} />)
    const turnOnBtn = await screen.findByRole('button', { name: 'Turn on sound' })
    fireEvent.click(turnOnBtn)

    await waitFor(() => {
      expect(FakeEventSource.instances.length).toBeGreaterThan(0)
    })
    FakeEventSource.instances[0]?.onopen?.(new Event('open'))

    // act: emit { type: 'created', order: makeOrder('pending', { id: 5, orderNumber: 5,
    // createdAt: now }) }
    const order5 = makeOrder('pending', {
      id: 5,
      orderNumber: 5,
      createdAt: now,
    })
    FakeEventSource.instances[0]?.emit('order', { type: 'created', order: order5 })

    // assert: the banner (role alert) reads "New order 5", oscillators were created; after 3.5 s
    // more oscillators; then emit the same order 'updated' as confirmed (confirmedAt now): the
    // banner is gone and 3.5 s later no new oscillators
    const banner = await screen.findByRole('alert')
    expect(banner.textContent).toContain('New order 5')
    expect(FakeAudioContext.createdOscillators.length).toBeGreaterThan(0)
    const countAfterFirst = FakeAudioContext.createdOscillators.length

    await act(async () => {
      vi.advanceTimersByTime(3500)
    })
    expect(FakeAudioContext.createdOscillators.length).toBeGreaterThan(countAfterFirst)

    FakeEventSource.instances[0]?.emit('order', {
      type: 'updated',
      order: { ...order5, status: 'confirmed', confirmedAt: now },
    })

    await waitFor(() => {
      expect(screen.queryByRole('alert')).toBeNull()
    })
    // let React run the effect that stops the ring before counting
    await act(async () => {})
    const countAfterHandled = FakeAudioContext.createdOscillators.length

    await act(async () => {
      vi.advanceTimersByTime(3500)
    })
    expect(FakeAudioContext.createdOscillators.length).toBe(countAfterHandled)
  })

  it('stays quiet about orders from before the board opened', async () => {
    // arrange: role waiter; render and turn on sound; the stream opens
    render(<OrderBoard role="waiter" tenantId={1} />)
    const turnOnBtn = await screen.findByRole('button', { name: 'Turn on sound' })
    fireEvent.click(turnOnBtn)

    await waitFor(() => {
      expect(FakeEventSource.instances.length).toBeGreaterThan(0)
    })
    FakeEventSource.instances[0]?.onopen?.(new Event('open'))

    // act: emit 'updated' for a pending order created an hour before the board opened (its
    // guest name changed)
    const oldOrder = makeOrder('pending', {
      id: 8,
      orderNumber: 8,
      createdAt: new Date(Date.now() - 3600_000).toISOString(),
      guestName: 'Changed Name',
    })
    FakeEventSource.instances[0]?.emit('order', { type: 'updated', order: oldOrder })
    // let the frame's state updates render before asserting nothing appeared
    await act(async () => {})
    await screen.findByText('Changed Name')

    // assert: no banner, no oscillators
    expect(screen.queryByRole('alert')).toBeNull()
    expect(FakeAudioContext.createdOscillators).toHaveLength(0)
  })

  it('uses the request tone for bill requests', async () => {
    // arrange: role cashier; localStorage 'orders-notify:7:1:cashier:tone' = "chime" and
    // ':requestTone' = "bell"; render, turn on sound; reference: the frequencies 'bell' plays
    // (playTone on a separate FakeAudioContext, then reset the recorded oscillators)
    localStorage.setItem('orders-notify:7:1:cashier:tone', JSON.stringify('chime'))
    localStorage.setItem('orders-notify:7:1:cashier:requestTone', JSON.stringify('bell'))

    // The fake implements only what tones use
    const refCtx = new FakeAudioContext() as unknown as AudioContext
    playTone(refCtx, 'bell', 'normal')
    const refFrequencies = FakeAudioContext.createdOscillators.flatMap((osc) =>
      osc.frequency.setValueAtTime.mock.calls.map((call) => call[0]),
    )
    FakeAudioContext.createdOscillators = []

    render(<OrderBoard role="cashier" tenantId={1} />)
    const turnOnBtn = await screen.findByRole('button', { name: 'Turn on sound' })
    fireEvent.click(turnOnBtn)

    await waitFor(() => {
      expect(FakeEventSource.instances.length).toBeGreaterThan(0)
    })
    FakeEventSource.instances[0]?.onopen?.(new Event('open'))

    // act: emit 'updated' for a served order with billRequestedAt = now
    const now = new Date().toISOString()
    const servedOrder = makeOrder('served', {
      id: 12,
      orderNumber: 12,
      table: 4,
      billRequestedAt: now,
    })
    FakeEventSource.instances[0]?.emit('order', { type: 'updated', order: servedOrder })

    // assert: the banner reads "Table … asks for the bill"; the played frequencies are bell's,
    // not chime's
    const banner = await screen.findByRole('alert')
    expect(banner.textContent).toContain('Table 4 asks for the bill')
    const playedFrequencies = FakeAudioContext.createdOscillators.flatMap((osc) =>
      osc.frequency.setValueAtTime.mock.calls.map((call) => call[0]),
    )
    expect(playedFrequencies).toEqual(refFrequencies)
  })

  it('stops ringing when told to', async () => {
    // arrange: fake timers; role waiter; turn on sound; emit a new pending order (rings)
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const now = '2026-11-05T12:00:00.000Z'
    vi.setSystemTime(new Date(now))

    render(<OrderBoard role="waiter" tenantId={1} />)
    const turnOnBtn = await screen.findByRole('button', { name: 'Turn on sound' })
    fireEvent.click(turnOnBtn)

    await waitFor(() => {
      expect(FakeEventSource.instances.length).toBeGreaterThan(0)
    })
    FakeEventSource.instances[0]?.onopen?.(new Event('open'))

    FakeEventSource.instances[0]?.emit('order', {
      type: 'created',
      order: makeOrder('pending', { id: 9, orderNumber: 9, createdAt: now }),
    })
    await screen.findByRole('alert')
    expect(FakeAudioContext.createdOscillators.length).toBeGreaterThan(0)

    // act: click "Stop ringing", reset the recorded oscillators, advance 3.5 s
    const stopBtn = screen.getByRole('button', { name: 'Stop ringing' })
    fireEvent.click(stopBtn)
    FakeAudioContext.createdOscillators = []

    await act(async () => {
      vi.advanceTimersByTime(3500)
    })

    // assert: the banner is gone and no oscillators were created
    expect(screen.queryByRole('alert')).toBeNull()
    expect(FakeAudioContext.createdOscillators).toHaveLength(0)
  })

  it('keeps alert settings per board', async () => {
    // arrange: role kitchen; render, open "Alerts", untick "Ring until handled"
    const { unmount } = render(<OrderBoard role="kitchen" tenantId={1} />)
    const alertsBtn = await screen.findByRole('button', { name: 'Alerts' })
    fireEvent.click(alertsBtn)

    const ringCheckbox = await screen.findByRole('checkbox', { name: 'Ring until handled' })
    fireEvent.click(ringCheckbox)

    // act: unmount, render the waiter board (same user and tenant)
    unmount()
    cleanup()

    render(<OrderBoard role="waiter" tenantId={1} />)
    const waiterAlertsBtn = await screen.findByRole('button', { name: 'Alerts' })
    fireEvent.click(waiterAlertsBtn)

    // assert: localStorage 'orders-notify:7:1:kitchen:loop' is false; the waiter board's
    // "Ring until handled" is still ticked
    expect(localStorage.getItem('orders-notify:7:1:kitchen:loop')).toBe('false')
    const waiterRingCheckbox = await screen.findByRole('checkbox', { name: 'Ring until handled' })
    expect(waiterRingCheckbox).toHaveProperty('checked', true)
  })

  it('takes a payment from the cashier board', async () => {
    // arrange: cashier board, one served unpaid order on Active; recordPaymentAction resolves ok
    // act: click "Take payment", type 50 in Received, click "Take payment" in the dialog
    // assert: recordPaymentAction called with { orderId, method: 'cash', received: 5000 }; the
    //         dialog closes and "Payment taken · Order <n>" shows
    const order = makeOrder('served', {
      id: 42,
      orderNumber: 42,
      paymentStatus: 'unpaid',
      total: 4300,
    })
    vi.mocked(listBoardOrdersAction).mockResolvedValue({
      ok: true,
      data: { orders: [order], page: 1, totalPages: 1 },
    })
    vi.mocked(recordPaymentAction).mockResolvedValue({
      ok: true,
      data: {
        id: 101,
        order: order.id,
        method: 'cash',
        status: 'succeeded',
        amount: 4300,
        received: 5000,
        change: 700,
        createdAt: '2026-11-05T12:00:00.000Z',
        updatedAt: '2026-11-05T12:00:00.000Z',
      },
    })

    render(<OrderBoard role="cashier" tenantId={1} />)
    const cardPayBtn = await screen.findByRole('button', { name: 'Take payment' })
    fireEvent.click(cardPayBtn)

    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Received'), { target: { value: '50' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Take payment' }))

    await waitFor(() => {
      expect(recordPaymentAction).toHaveBeenCalledWith({
        orderId: order.id,
        method: 'cash',
        received: 5000,
      })
    })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(await screen.findByText(`Payment taken · Order ${order.orderNumber}`)).toBeTruthy()
  })

  it('shows the payment of a paid order', async () => {
    // arrange: cashier board, a paid open order with a bill request on Active;
    //          getOrderPaymentAction resolves a cash payment
    // act: click "Payment"
    // assert: getOrderPaymentAction called with the order id; the dialog shows the payment
    //         read-only (method Cash) with "Void payment"
    const order = makeOrder('served', {
      id: 43,
      orderNumber: 43,
      paymentStatus: 'paid',
      billRequestedAt: '2026-11-05T12:00:00.000Z',
    })
    vi.mocked(listBoardOrdersAction).mockResolvedValue({
      ok: true,
      data: { orders: [order], page: 1, totalPages: 1 },
    })
    vi.mocked(getOrderPaymentAction).mockResolvedValue({
      ok: true,
      data: {
        id: 102,
        order: order.id,
        method: 'cash',
        status: 'succeeded',
        amount: 4300,
        received: 5000,
        change: 700,
        remarks: 'Tip kept',
        createdAt: '2026-11-05T12:00:00.000Z',
        updatedAt: '2026-11-05T12:00:00.000Z',
      },
    })

    render(<OrderBoard role="cashier" tenantId={1} />)
    const paymentBtn = await screen.findByRole('button', { name: 'Payment' })
    fireEvent.click(paymentBtn)

    await waitFor(() => {
      expect(getOrderPaymentAction).toHaveBeenCalledWith(order.id)
    })
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/Cash/i)).toBeTruthy()
    expect(within(dialog).getByRole('button', { name: 'Void payment' })).toBeTruthy()
  })

  it('closes an order without payment', async () => {
    // arrange: cashier board, one served unpaid order; closeOrderAction resolves the completed
    //          order
    // act: click "Close order", pick "Complimentary", click "Close order" in the dialog
    // assert: closeOrderAction called with { orderId, outcome: 'unpaid', reason: 'complimentary' };
    //         the order leaves the Active list
    const order = makeOrder('served', {
      id: 44,
      orderNumber: 44,
      paymentStatus: 'unpaid',
    })
    vi.mocked(listBoardOrdersAction).mockResolvedValue({
      ok: true,
      data: { orders: [order], page: 1, totalPages: 1 },
    })
    vi.mocked(closeOrderAction).mockResolvedValue({
      ok: true,
      data: {
        ...order,
        status: 'completed',
        closeReason: 'complimentary',
      },
    })

    render(<OrderBoard role="cashier" tenantId={1} />)
    const cardCloseBtn = await screen.findByRole('button', { name: 'Close order' })
    fireEvent.click(cardCloseBtn)

    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Complimentary' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close order' }))

    await waitFor(() => {
      expect(closeOrderAction).toHaveBeenCalledWith({
        orderId: order.id,
        outcome: 'unpaid',
        reason: 'complimentary',
      })
    })
    await waitFor(() => {
      expect(screen.queryByText(new RegExp(`Order ${order.orderNumber}`))).toBeNull()
    })
  })
})
