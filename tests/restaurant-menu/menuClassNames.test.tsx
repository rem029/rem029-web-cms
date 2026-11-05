// @vitest-environment jsdom
// Stable class names on the guest menu (rem0017 phase 3 step 6, `src/app/(frontend)/menu/`):
// every part guests see has a plain class (next to the Tailwind utilities) so a business can
// restyle it from its Theme's custom CSS. The names are the list in
// `docs/tasks/rem0017-restaurant-menu/references/menu-class-names.md`.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import { CategoryNav } from '@/app/(frontend)/menu/_components/CategoryNav'
import { FilterAllergens } from '@/app/(frontend)/menu/_components/FilterAllergens'
import { ItemView } from '@/app/(frontend)/menu/_components/ItemView'
import { Menu } from '@/app/(frontend)/menu/_components/Menu'
import { MenuCard } from '@/app/(frontend)/menu/_components/MenuCard'
import { MenuCarousel } from '@/app/(frontend)/menu/_components/MenuCarousel'
import { MenuFooter } from '@/app/(frontend)/menu/_components/MenuFooter'
import { MenuHeader } from '@/app/(frontend)/menu/_components/MenuHeader'
import { MenuItemCard } from '@/app/(frontend)/menu/_components/MenuItemCard'
import { MenuIntro } from '@/app/(frontend)/menu/_components/MenuIntro'
import { ScrollToTop } from '@/app/(frontend)/menu/_components/ScrollToTop'
import { SearchOverlay } from '@/app/(frontend)/menu/_components/SearchOverlay'
import { CartBar } from '@/app/(frontend)/menu/_components/ordering/CartBar'
import { OrderTracker } from '@/app/(frontend)/menu/_components/ordering/OrderTracker'
import { TableChip } from '@/app/(frontend)/menu/_components/ordering/TableChip'
import { YourOrders } from '@/app/(frontend)/menu/_components/ordering/YourOrders'
import { CartStoreProvider, cartStorageKey } from '@/app/(frontend)/menu/_store/cart'
import { MenuStoreProvider } from '@/app/(frontend)/menu/_store/store'
import { MyOrdersProvider, myOrdersStorageKey } from '@/app/(frontend)/menu/_store/myOrders'
import type { AlertSound } from '@/common/components/AlertSounds/useAlertSound'
import type { BrowserNotifications } from '@/common/components/AlertSounds/useBrowserNotifications'
import type { GuestOrder } from '@/common/utils/guestOrder'
import type { Media, Setting } from '@/payload-types'

import { guestItem, section } from './guestItems'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/menu/dinner',
}))

vi.mock('@/app/(frontend)/menu/_actions', () => ({ searchMenuItemsAction: vi.fn() }))
vi.mock('@/app/(frontend)/menu/_actions/orders', () => ({
  getOrderStatusAction: vi.fn(async () => ({ ok: false, status: 500, error: 'failed' })),
  cancelOrderAction: vi.fn(),
  requestAssistanceAction: vi.fn(),
  payOnlineAction: vi.fn(),
}))

// the guest's tracking (rem0018 phase 3 step 2b): sound and notifications as plain objects, no stream
class SilentEventSource {
  addEventListener() {}
  removeEventListener() {}
  close() {}
}
const sound: AlertSound = {
  ready: false,
  enable: vi.fn(async () => {}),
  enabled: true,
  setEnabled: vi.fn(),
  level: 'normal',
  setLevel: vi.fn(),
  tone: 'chime',
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
  permission: 'default',
  requestPermission: vi.fn(async () => {}),
  notify: vi.fn(),
}
const guestOrder = (overrides: Partial<GuestOrder>): GuestOrder => ({
  id: 7,
  orderNumber: 12,
  status: 'pending',
  paymentStatus: 'unpaid',
  table: '5',
  guestName: null,
  notes: null,
  lines: [{ title: 'Karak', quantity: 1, unitPrice: 500, lineTotal: 500, options: [] }],
  total: 500,
  currency: 'QAR',
  showPrices: true,
  createdAt: '2026-11-04T10:00:00.000Z',
  assistanceRequestedAt: null,
  billRequestedAt: null,
  receipt: null,
  ...overrides,
})
const trackerOf = (order: GuestOrder) =>
  render(
    <OrderTracker
      order={order}
      token="t"
      live
      locale="en"
      onlinePayment
      sound={sound}
      notifications={notifications}
      onUpdate={vi.fn()}
      onClose={vi.fn()}
    />,
  )

const logo: Media = {
  id: 1,
  url: '/logo.png',
  alt: 'Logo',
  updatedAt: '2026-10-17T00:00:00.000Z',
  createdAt: '2026-10-17T00:00:00.000Z',
}

const mockSettings: Setting = {
  id: 1,
  siteName: 'Cafe Test',
  contact: { phone: '+974 5555 0000' },
  address: { full_address: 'Corniche Street, Doha' },
  socialMedia: { instagram: 'https://instagram.com' },
  updatedAt: '2026-10-17T00:00:00.000Z',
  createdAt: '2026-10-17T00:00:00.000Z',
}

const scrollIntoView = vi.fn()

describe('menu class names', () => {
  beforeEach(() => {
    localStorage.clear()
    Element.prototype.scrollIntoView = scrollIntoView
    window.history.replaceState(null, '', '/menu/dinner')
    if (typeof HTMLDialogElement !== 'undefined') {
      HTMLDialogElement.prototype.showModal ??= function () {
        this.setAttribute('open', '')
      }
      HTMLDialogElement.prototype.close ??= function () {
        this.removeAttribute('open')
      }
    }
  })

  afterEach(() => {
    cleanup()
    scrollIntoView.mockClear()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  // one row per part: [part, how it is rendered, the class names it must have]
  it.each([
    [
      'header',
      'MenuHeader with a logo, title and the language switch',
      'menu-header, menu-header-inner, menu-logo, menu-header-title, menu-lang-switch, menu-lang-link',
      () =>
        render(
          <MenuHeader title="Dinner" logo={logo} homeHref="/menu" showLanguageSwitch locale="en" />,
        ),
    ],
    [
      'carousel',
      'MenuCarousel with two images',
      'menu-carousel, menu-carousel-slide, menu-carousel-image',
      () =>
        render(
          <MenuCarousel
            images={[
              { url: '/img1.jpg', alt: '1' },
              { url: '/img2.jpg', alt: '2' },
            ]}
          />,
        ),
    ],
    [
      'intro',
      'the [slug] page intro (heading + subheading)',
      'menu-intro, menu-title, menu-sub-header',
      () => render(<MenuIntro heading="Heading" subheading="Subheading" title="Dinner" />),
    ],
    [
      'toolbar',
      'Menu with search and filters on',
      'menu-toolbar, menu-btn, menu-search-btn, menu-filter-btn',
      () =>
        render(
          <Menu
            menuId={1}
            sections={[
              section('starters', 'Starters', [
                guestItem({ slug: 'soup', allergens: [{ id: 1, title: 'Gluten' }] }),
              ]),
            ]}
            currency="USD"
            locale="en"
            filters={{ showSearch: true, showAllergens: true, showAvailability: true }}
          />,
        ),
    ],
    [
      'category nav',
      'CategoryNav with two sections',
      'menu-category-nav, menu-category-list, menu-category-chip',
      () =>
        render(
          <MenuStoreProvider>
            <CategoryNav
              sections={[section('starters', 'Starters', []), section('mains', 'Mains', [])]}
              locale="en"
            />
          </MenuStoreProvider>,
        ),
    ],
    [
      'filters',
      'Menu with both filters on, the filters panel opened',
      'menu-filters, menu-filter-group, menu-filter-label, menu-filter-chip',
      () => {
        const view = render(
          <Menu
            menuId={1}
            sections={[
              section('starters', 'Starters', [
                guestItem({ slug: 'soup', allergens: [{ id: 1, title: 'Gluten' }] }),
              ]),
            ]}
            currency="USD"
            locale="en"
            filters={{ showSearch: false, showAllergens: true, showAvailability: true }}
          />,
        )
        fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
        return view
      },
    ],
    [
      'section',
      'Menu with one category',
      'menu-section, menu-section-title, menu-items',
      () =>
        render(
          <Menu
            menuId={1}
            sections={[section('starters', 'Starters', [guestItem()])]}
            currency="USD"
            locale="en"
            filters={{}}
          />,
        ),
    ],
    [
      'item card',
      'MenuItemCard with image, description, out of stock',
      'menu-item-card, is-out-of-stock, menu-item-text, menu-item-title, menu-item-description, menu-item-price, menu-item-badge, menu-item-image',
      () =>
        render(
          <MenuItemCard
            item={guestItem({
              title: 'Soup',
              description: 'Warm soup',
              thumbnailUrl: '/thumb.jpg',
              inStock: false,
            })}
            currency="USD"
            locale="en"
            onOpen={vi.fn()}
          />,
        ),
    ],
    [
      'item view',
      'ItemView with image, allergens and options',
      'menu-item-view, menu-item-view-image, menu-item-view-title, menu-item-view-close, menu-item-view-price, menu-item-view-list, menu-item-view-options, menu-item-view-option-price',
      () =>
        render(
          <ItemView
            item={guestItem({
              title: 'Burger',
              imageUrl: '/burger.jpg',
              allergens: [{ id: 1, title: 'Gluten' }],
              modifierGroups: [
                {
                  name: 'Size',
                  inputType: 'radio',
                  required: true,
                  options: [
                    { id: 'small', label: 'Small', price: null },
                    { id: 'large', label: 'Large', price: 2 },
                  ],
                },
              ],
            })}
            currency="USD"
            locale="en"
            onClose={vi.fn()}
          />,
        ),
    ],
    [
      'search',
      'SearchOverlay open with no results',
      'menu-search, menu-search-input, menu-search-close, menu-search-results, menu-search-empty',
      () =>
        render(
          <SearchOverlay
            menuId={1}
            currency="USD"
            locale="en"
            onOpenItem={vi.fn()}
            onClose={vi.fn()}
          />,
        ),
    ],
    [
      'menu card',
      'MenuCard with image and subtitle',
      'menu-card, menu-card-image, menu-card-title, menu-card-subtitle',
      () =>
        render(
          <MenuCard
            menu={{
              title: 'Dinner',
              slug: 'dinner',
              intro: { heading: 'Evening dishes' },
              carousel: [
                {
                  image: {
                    id: 1,
                    url: '/img.jpg',
                    alt: 'img',
                    updatedAt: '',
                    createdAt: '',
                  },
                },
              ],
            }}
          />,
        ),
    ],
    [
      'footer',
      'MenuFooter with contact and socials, and ScrollToTop',
      'menu-footer, menu-footer-link, menu-socials, menu-scroll-top',
      () =>
        render(
          <>
            <MenuFooter settings={mockSettings} locale="en" />
            <ScrollToTop locale="en" />
          </>,
        ),
    ],
    [
      'open status',
      'MenuHeader with openStatus closed',
      'menu-open-status, is-closed',
      () =>
        render(
          <MenuHeader
            title="Dinner"
            logo={logo}
            homeHref="/menu"
            showLanguageSwitch
            locale="en"
            openStatus={{ open: false, next: { weekday: 'mon', opens: '08:00' } }}
          />,
        ),
    ],
    [
      'table chip',
      'TableChip with a table',
      'menu-table-chip',
      () =>
        render(
          <TableChip table={{ id: 1, slug: 't5', label: '5' }} locale="en" onChange={vi.fn()} />,
        ),
    ],
    [
      'item view ordering',
      'ItemView with ordering, an item with a required group',
      'menu-item-view-choice, menu-item-view-breakdown, menu-qty, menu-qty-btn, menu-qty-value, menu-add-to-cart',
      () =>
        render(
          <ItemView
            item={guestItem({
              title: 'Latte',
              modifierGroups: [
                {
                  name: 'Size',
                  inputType: 'radio',
                  required: true,
                  options: [
                    { id: 'small', label: 'Small', price: null },
                    { id: 'large', label: 'Large', price: 2 },
                  ],
                },
              ],
            })}
            currency="QAR"
            locale="en"
            onClose={vi.fn()}
            ordering={{ showPrices: true, onAdd: vi.fn() }}
          />,
        ),
    ],
    [
      'cart',
      'CartBar with one line, the sheet opened',
      'menu-cart-bar, menu-cart, menu-cart-line, menu-cart-total, menu-place-order',
      () => {
        localStorage.setItem(
          cartStorageKey(1, 'corniche'),
          JSON.stringify({
            state: {
              lines: [{ itemId: 1, optionIds: [], quantity: 1, key: '1:' }],
              guestName: '',
              notes: '',
              tableSlug: 't5',
            },
            version: 0,
          }),
        )
        const view = render(
          <CartStoreProvider tenantId={1} menuSlug="corniche">
            <CartBar
              items={[guestItem({ id: 1, title: 'Item 1' })]}
              currency="QAR"
              locale="en"
              ordering={{
                tenantId: 1,
                menuSlug: 'corniche',
                showPrices: true,
                table: { id: 1, slug: 't5', label: '5' },
                tableRefused: false,
                ordersOnlyWhenOpen: false,
                open: { open: true, next: null },
                onlinePayment: false,
                returnedOrderId: null,
              }}
              onPickTable={vi.fn()}
              onPlaced={vi.fn()}
            />
          </CartStoreProvider>,
        )
        fireEvent.click(screen.getByRole('button'))
        return view
      },
    ],
    [
      'your orders',
      'YourOrders with one saved order',
      'menu-your-orders, menu-your-order',
      () => {
        vi.stubGlobal('EventSource', SilentEventSource)
        localStorage.setItem(
          myOrdersStorageKey(1),
          JSON.stringify({
            state: {
              orders: [
                {
                  orderId: 7,
                  orderNumber: 12,
                  menuSlug: 'corniche',
                  token: 't',
                  placedAt: new Date().toISOString(),
                  finishedAt: null,
                },
              ],
            },
            version: 0,
          }),
        )
        return render(
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
      },
    ],
    [
      'tracker',
      'OrderTracker, pending, unpaid, online payment on',
      'menu-tracker, menu-tracker-step, menu-tracker-live, menu-call-staff, menu-ask-bill, menu-cancel-order, menu-pay-options, menu-pay-now, menu-notify-prompt',
      () => trackerOf(guestOrder({})),
    ],
    [
      'receipt',
      'OrderTracker, paid',
      'menu-receipt',
      () =>
        trackerOf(
          guestOrder({
            paymentStatus: 'paid',
            receipt: { method: 'cash', amount: 500, paidAt: '2026-11-04T10:10:00.000Z' },
          }),
        ),
    ],
  ])('gives the %s its class names', (_part, _render, classes, renderFn) => {
    // arrange: the component as described, with the guest fixtures (./guestItems)
    // act: render it
    const { container } = renderFn()

    // assert: each class in the list is on an element (container.querySelector('.<class>'))
    const missing = classes
      .split(',')
      .map((cls) => cls.trim())
      .filter((cls) => container.querySelector(`.${cls}`) === null)
    expect(missing).toEqual([])
  })

  it('marks the active category and filter chips with is-active', () => {
    // arrange: CategoryNav with the first section active, FilterAllergens with one picked
    const navSections = [section('starters', 'Starters', []), section('mains', 'Mains', [])]
    const allergens = [
      { id: 1, title: 'Gluten' },
      { id: 2, title: 'Dairy' },
    ]

    // act: render
    const { container } = render(
      <MenuStoreProvider initial={{ category: 'category-starters', allergens: [1] }}>
        <CategoryNav sections={navSections} locale="en" />
        <FilterAllergens allergens={allergens} locale="en" />
      </MenuStoreProvider>,
    )

    // assert: exactly the active chip and the picked filter chip have `is-active`
    const active = Array.from(container.querySelectorAll('.is-active'))
    expect(active).toHaveLength(2)
    expect(active[0]?.textContent).toContain('Starters')
    expect(active[1]?.textContent).toContain('Gluten')
  })
})
