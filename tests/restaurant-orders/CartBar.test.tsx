// @vitest-environment jsdom
// The guest's cart bar and sheet (rem0018 phase 3 step 2a,
// src/app/(frontend)/menu/_components/ordering/CartBar.tsx).
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CartBar } from '@/app/(frontend)/menu/_components/ordering/CartBar'
import type { MenuOrdering } from '@/app/(frontend)/menu/_data/ordering'
import { menuStrings } from '@/app/(frontend)/menu/_i18n'
import { CartStoreProvider, cartStorageKey } from '@/app/(frontend)/menu/_store/cart'
import { formatMinor } from '@/common/utils/money'

import { guestItem } from '../restaurant-menu/guestItems'

vi.mock('@/app/(frontend)/menu/_actions/orders', () => ({
  placeOrderAction: vi.fn(),
  listMenuTablesAction: vi.fn(),
}))

// arrangement:
// - vi.mock('@/app/(frontend)/menu/_actions/orders', () => ({ placeOrderAction: vi.fn() }))
// - items from tests/restaurant-menu/guestItems.ts: Latte 15.00 with "Size" (Large + 2.00) and
//   "Milk" (Oat + 1.00, Whole free); Water 3.00
// - render inside CartStoreProvider (tenant 1, menu "corniche") with lines added through the
//   store before render (a small `withCart(lines)` helper); `ordering` = open, prices on, table t5
// - localStorage.clear() before each; cleanup after each

const latte = guestItem({
  id: 1,
  title: 'Latte',
  price: 15,
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
    {
      name: 'Milk',
      inputType: 'checkbox',
      required: false,
      options: [
        { id: 'oat', label: 'Oat', price: 1 },
        { id: 'whole', label: 'Whole', price: null },
      ],
    },
  ],
})

const water = guestItem({
  id: 2,
  title: 'Water',
  price: 3,
  modifierGroups: [],
})

const items = [latte, water]

const baseOrdering: MenuOrdering = {
  tenantId: 1,
  menuSlug: 'corniche',
  showPrices: true,
  table: { id: 1, slug: 't5', label: '5' },
  tableRefused: false,
  ordersOnlyWhenOpen: false,
  open: { open: true, next: null },
  onlinePayment: false,
  returnedOrderId: null,
}

const money = (minor: number) => formatMinor(minor, 'QAR', 'en').replace(/\s+/g, ' ')

const seedCart = (lines: { itemId: number; optionIds: string[]; quantity: number }[]) => {
  const cartLines = lines.map((line) => ({
    ...line,
    key: `${line.itemId}:${[...line.optionIds].sort().join(',')}`,
  }))
  const data = {
    state: {
      lines: cartLines,
      guestName: '',
      notes: '',
      tableSlug: 't5',
    },
    version: 0,
  }
  localStorage.setItem(cartStorageKey(1, 'corniche'), JSON.stringify(data))
}

const renderCartBar = (ordering: MenuOrdering = baseOrdering) =>
  render(
    <CartStoreProvider tenantId={1} menuSlug="corniche">
      <CartBar
        items={items}
        currency="QAR"
        locale="en"
        ordering={ordering}
        onPickTable={vi.fn()}
        onPlaced={vi.fn()}
      />
    </CartStoreProvider>,
  )

describe('CartBar', () => {
  beforeEach(() => {
    localStorage.clear()
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
  })

  it('shows the breakdown of each line', () => {
    // arrange: 1 × Latte with Large, Oat and Whole
    seedCart([{ itemId: latte.id, optionIds: ['large', 'oat', 'whole'], quantity: 1 }])

    // act: render, click "View order"
    const { container } = renderCartBar()
    const t = menuStrings('en')
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t.viewOrder) }))

    // assert: the line reads Latte, 15.00, Large + 2.00, Oat + 1.00, Whole (no price), 18.00
    const text = container.querySelector('.menu-cart-line')?.textContent?.replace(/\s+/g, ' ') ?? ''
    expect(text).toContain('Latte')
    expect(text).toContain(money(1500))
    expect(text).toContain('Large')
    expect(text).toContain(money(200))
    expect(text).toContain('Oat')
    expect(text).toContain(money(100))
    expect(text).toContain('Whole')
    expect(text).toContain(money(1800))
  })

  it('totals items with quantities', () => {
    // arrange: 2 × Latte with Large, 3 × Water
    seedCart([
      { itemId: latte.id, optionIds: ['large'], quantity: 2 },
      { itemId: water.id, optionIds: [], quantity: 3 },
    ])

    // act: render
    renderCartBar()

    // assert: the bar says 5 items and the total 43.00 (2 × 17.00 + 3 × 3.00)
    const t = menuStrings('en')
    const bar = screen.getByRole('button', { name: new RegExp(t.viewOrder) })
    const barText = bar.textContent?.replace(/\s+/g, ' ') ?? ''
    expect(barText).toContain(t.items.replace('{count}', '5'))
    expect(barText).toContain(money(4300))
  })

  it('hides prices when prices are off', () => {
    // arrange: ordering.showPrices false, 1 × Latte with Large
    seedCart([{ itemId: latte.id, optionIds: ['large'], quantity: 1 }])

    // act: render, open the sheet
    const { container } = renderCartBar({ ...baseOrdering, showPrices: false })
    const t = menuStrings('en')
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t.viewOrder) }))

    // assert: Latte and Large shown, no amount anywhere (no "15.00", "2.00", "17.00")
    const text = container.querySelector('.menu-cart')?.textContent?.replace(/\s+/g, ' ') ?? ''
    expect(text).toContain('Latte')
    expect(text).toContain('Large')
    expect(text).not.toContain(money(1500))
    expect(text).not.toContain(money(200))
    expect(text).not.toContain(money(1700))
  })

  it('disables Place order while closed', () => {
    // arrange: ordersOnlyWhenOpen true, open { open: false, next: { weekday: 'mon', opens: '08:00' } }
    seedCart([{ itemId: latte.id, optionIds: ['large'], quantity: 1 }])
    const closedOrdering: MenuOrdering = {
      ...baseOrdering,
      ordersOnlyWhenOpen: true,
      open: { open: false, next: { weekday: 'mon', opens: '08:00' } },
    }

    // act: render, open the sheet
    const { container } = renderCartBar(closedOrdering)
    const t = menuStrings('en')
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t.viewOrder) }))

    // assert: Place order is disabled and the sheet says "Closed, opens Monday at 08:00"
    const placeOrderButton = screen.getByRole('button', { name: t.placeOrder })
    expect(placeOrderButton).toHaveProperty('disabled', true)
    const expectedNotice = t.closedOpens.replace('{day}', t.mon).replace('{time}', '08:00')
    const sheetText = container.querySelector('.menu-cart')?.textContent ?? ''
    expect(sheetText).toContain(expectedNotice)
  })
})
