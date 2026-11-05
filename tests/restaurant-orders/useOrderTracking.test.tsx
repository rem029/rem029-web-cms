// @vitest-environment jsdom
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getOrderStatusAction } from '@/app/(frontend)/menu/_actions/orders'
import { useOrderTracking } from '@/app/(frontend)/menu/_hooks/useOrderTracking'
import type { GuestOrder } from '@/common/utils/guestOrder'

// rem0018 phase 3 step 2b: one order, live. renderHook(useOrderTracking); getOrderStatusAction
// mocked (the server boundary); a fake EventSource on globalThis records its url and lets the
// test fire open / error / `order` frames.

vi.mock('@/app/(frontend)/menu/_actions/orders', () => ({
  getOrderStatusAction: vi.fn(),
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
}

const makeGuestOrder = (status: GuestOrder['status'] = 'pending'): GuestOrder => ({
  id: 1,
  orderNumber: 42,
  status,
  paymentStatus: 'unpaid',
  table: 'Table 1',
  guestName: 'Guest',
  notes: null,
  lines: [],
  total: 1000,
  currency: 'USD',
  showPrices: true,
  createdAt: '2026-11-04T10:00:00.000Z',
  assistanceRequestedAt: null,
  billRequestedAt: null,
  receipt: null,
})

describe('useOrderTracking', () => {
  beforeEach(() => {
    FakeEventSource.instances = []
    vi.stubGlobal('EventSource', FakeEventSource)
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    })
    vi.restoreAllMocks()
  })

  it('refetches the order when the stream reopens', async () => {
    // arrange: baseline 'pending'
    const pendingOrder = makeGuestOrder('pending')
    const confirmedOrder = makeGuestOrder('confirmed')
    vi.mocked(getOrderStatusAction).mockResolvedValue({ ok: true, order: pendingOrder })

    const { result } = renderHook(() => useOrderTracking({ orderId: 1, token: 'tok-123' }))
    const source = FakeEventSource.instances[0]

    // act: open, error, then the action answers 'confirmed' and the stream opens again
    source?.onopen?.(new Event('open'))
    source?.onerror?.(new Event('error'))
    expect(result.current.live).toBe(false)

    vi.mocked(getOrderStatusAction).mockResolvedValue({ ok: true, order: confirmedOrder })
    source?.onopen?.(new Event('open'))

    // assert: live false after the error, then true; the order is 'confirmed'; the action ran
    //         three times (mount, first open, reopen)
    await waitFor(() => {
      expect(getOrderStatusAction).toHaveBeenCalledTimes(3)
      expect(result.current.live).toBe(true)
      expect(result.current.order?.status).toBe('confirmed')
    })
  })

  it('refetches the order when the tab comes back', async () => {
    // arrange: baseline 'pending', stream open
    const pendingOrder = makeGuestOrder('pending')
    const preparingOrder = makeGuestOrder('preparing')
    vi.mocked(getOrderStatusAction).mockResolvedValue({ ok: true, order: pendingOrder })

    const { result } = renderHook(() => useOrderTracking({ orderId: 1, token: 'tok-123' }))
    const source = FakeEventSource.instances[0]
    source?.onopen?.(new Event('open'))
    const callsBefore = vi.mocked(getOrderStatusAction).mock.calls.length

    // act: the action answers 'preparing'; document.visibilityState 'visible' +
    //      visibilitychange
    vi.mocked(getOrderStatusAction).mockResolvedValue({ ok: true, order: preparingOrder })
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    })
    document.dispatchEvent(new Event('visibilitychange'))

    // assert: the order is 'preparing'
    await waitFor(() => {
      expect(getOrderStatusAction).toHaveBeenCalledTimes(callsBefore + 1)
      expect(result.current.order?.status).toBe('preparing')
    })
  })

  it('reopens the stream after the browser gives up', async () => {
    // arrange: baseline 'pending', stream open; fake timers
    vi.useFakeTimers()
    vi.mocked(getOrderStatusAction).mockResolvedValue({ ok: true, order: makeGuestOrder() })
    renderHook(() => useOrderTracking({ orderId: 1, token: 'tok-123' }))
    const first = FakeEventSource.instances[0]
    first?.onopen?.(new Event('open'))

    // act: the proxy answers 502 while the server restarts: the browser closes the stream for
    //      good (readyState CLOSED) and fires error; time passes
    first?.giveUp()
    await vi.advanceTimersByTimeAsync(30_000)
    vi.useRealTimers()

    // assert: a second stream on the same url
    expect(FakeEventSource.instances).toHaveLength(2)
    expect(FakeEventSource.instances[1]?.url).toBe(first?.url)
  })
})
