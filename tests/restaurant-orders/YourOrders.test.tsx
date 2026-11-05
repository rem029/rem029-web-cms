// @vitest-environment jsdom
import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getOrderStatusAction } from '@/app/(frontend)/menu/_actions/orders'
import { YourOrders } from '@/app/(frontend)/menu/_components/ordering/YourOrders'
import { menuStrings } from '@/app/(frontend)/menu/_i18n'
import {
  MyOrdersProvider,
  myOrdersStorageKey,
  type MyOrder,
} from '@/app/(frontend)/menu/_store/myOrders'
import { DEFAULT_LEVEL, DEFAULT_TONE } from '@/common/components/AlertSounds/tones'
import type { AlertSound } from '@/common/components/AlertSounds/useAlertSound'
import type { BrowserNotifications } from '@/common/components/AlertSounds/useBrowserNotifications'
import type { GuestOrder } from '@/common/utils/guestOrder'

// rem0018 phase 3 step 2b: "Your orders" and the guest's alerts. Seeds `orders-mine:<tenant>`
// in localStorage, mocks the actions (getOrderStatusAction answers the baseline) and a fake
// EventSource on globalThis that the test pushes `order` frames through.

vi.mock('@/app/(frontend)/menu/_actions/orders', () => ({
  getOrderStatusAction: vi.fn(),
}))

class FakeEventSource {
  static instances: FakeEventSource[] = []
  url: string
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
  }

  dispatchEvent(event: Event): boolean {
    const set = this.listeners.get(event.type)
    if (set) {
      set.forEach((listener) => listener(event))
    }
    return true
  }
}

const makeGuestOrder = (status: GuestOrder['status'] = 'pending'): GuestOrder => ({
  id: 42,
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

describe('YourOrders', () => {
  beforeEach(() => {
    FakeEventSource.instances = []
    vi.stubGlobal('EventSource', FakeEventSource)
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('plays the chosen sound when the order is ready', async () => {
    // arrange: one saved order; baseline 'preparing'; sound with tone 'bell' whose play is a spy
    //          (and notify from a real useBrowserNotifications over it, or a spy that plays)
    const t = menuStrings('en')
    const savedOrder: MyOrder = {
      orderId: 42,
      orderNumber: 42,
      menuSlug: 'corniche',
      token: 'guest-token-42',
      placedAt: new Date().toISOString(),
      finishedAt: null,
    }
    localStorage.setItem(
      myOrdersStorageKey(1),
      JSON.stringify({
        state: { orders: [savedOrder] },
        version: 0,
      }),
    )

    const preparingOrder = makeGuestOrder('preparing')
    vi.mocked(getOrderStatusAction).mockResolvedValue({ ok: true, order: preparingOrder })

    const sound: AlertSound = {
      ready: true,
      enable: vi.fn(async () => {}),
      enabled: true,
      setEnabled: vi.fn(),
      level: DEFAULT_LEVEL,
      setLevel: vi.fn(),
      tone: 'bell',
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
    }

    const notifications: BrowserNotifications = {
      permission: 'granted',
      requestPermission: vi.fn(async () => {}),
      notify: vi.fn(),
    }

    // act: render inside MyOrdersProvider, wait for '#n · Preparing', push an `order` frame
    //      with status 'prepared'
    render(
      <MyOrdersProvider tenantId={1}>
        <YourOrders
          locale="en"
          onlinePayment={false}
          openOrderId={null}
          onOpen={vi.fn()}
          sound={sound}
          notifications={notifications}
        />
      </MyOrdersProvider>,
    )

    await screen.findByText(new RegExp(`42.*${t.statusPreparing}`))

    const source = FakeEventSource.instances[0]
    const preparedOrder = { ...preparingOrder, status: 'prepared' as const }
    act(() => {
      source?.dispatchEvent(new MessageEvent('order', { data: JSON.stringify(preparedOrder) }))
    })

    // assert: notify called once with the ready title and whenVisible true; no call for the
    //         first snapshot
    await waitFor(() => expect(notifications.notify).toHaveBeenCalledTimes(1))
    expect(notifications.notify).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(t.readyTitle.replace('{number}', '.*'))),
      expect.objectContaining({ whenVisible: true }),
    )
  })
})
