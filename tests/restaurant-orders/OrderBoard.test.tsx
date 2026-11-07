// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { BoardContext } from '@/collections/Orders/utils/board'
import { OrderBoard } from '@/common/components/OrderBoard'
import {
  clearAssistanceAction,
  getBoardContextAction,
  listBoardOrdersAction,
  moveOrderAction,
} from '@/common/components/OrderBoard/actions'
import type { Order } from '@/payload-types'

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
})
