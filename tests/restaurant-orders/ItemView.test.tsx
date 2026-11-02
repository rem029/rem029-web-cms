// @vitest-environment jsdom
// Ordering from an item's detail view (rem0018 phase 3 step 2a,
// src/app/(frontend)/menu/_components/ItemView.tsx with `ordering`): the choices become inputs,
// with the price breakdown and Add to cart. The read-only view: tests/restaurant-menu/ItemView.test.tsx.
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ItemView } from '@/app/(frontend)/menu/_components/ItemView'
import { menuStrings } from '@/app/(frontend)/menu/_i18n'
import { formatMinor } from '@/common/utils/money'

import { guestItem } from '../restaurant-menu/guestItems'

// arrangement: Latte (guestItem) 15.00 with "Size" (radio, required: Small free, Large + 2.00)
// and "Milk" (checkbox: Oat + 1.00); ordering = { showPrices: true, onAdd: vi.fn() }; currency
// QAR, locale en; jsdom has no HTMLDialogElement.showModal: stub it as
// tests/restaurant-menu/ItemView.test.tsx does (or the same setup it uses)

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
      options: [{ id: 'oat', label: 'Oat', price: 1 }],
    },
  ],
})

const money = (minor: number) => formatMinor(minor, 'QAR', 'en').replace(/\s+/g, ' ')

describe('ItemView ordering', () => {
  beforeEach(() => {
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

  it('shows base price, chosen add-ons and the total', () => {
    // arrange: render
    const onAdd = vi.fn()
    const { container } = render(
      <ItemView
        item={latte}
        currency="QAR"
        locale="en"
        onClose={vi.fn()}
        ordering={{ showPrices: true, onAdd }}
      />,
    )

    // act: pick Large, tick Oat
    fireEvent.click(screen.getByRole('radio', { name: /Large/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /Oat/ }))

    // assert: the breakdown reads 15.00, Large + 2.00, Oat + 1.00, total 18.00
    const text =
      container.querySelector('.menu-item-view-breakdown')?.textContent?.replace(/\s+/g, ' ') ?? ''
    expect(text).toContain(money(1500))
    expect(text).toContain('Large')
    expect(text).toContain(money(200))
    expect(text).toContain('Oat')
    expect(text).toContain(money(100))
    expect(text).toContain(money(1800))
  })

  it('updates the total when a choice changes', () => {
    // arrange: render, pick Large (total 17.00)
    const onAdd = vi.fn()
    const { container } = render(
      <ItemView
        item={latte}
        currency="QAR"
        locale="en"
        onClose={vi.fn()}
        ordering={{ showPrices: true, onAdd }}
      />,
    )
    fireEvent.click(screen.getByRole('radio', { name: /Large/ }))
    const initialText =
      container.querySelector('.menu-item-view-breakdown')?.textContent?.replace(/\s+/g, ' ') ?? ''
    expect(initialText).toContain(money(1700))

    // act: pick Small, then + on the quantity
    fireEvent.click(screen.getByRole('radio', { name: /Small/ }))
    const textAfterSmall =
      container.querySelector('.menu-item-view-breakdown')?.textContent?.replace(/\s+/g, ' ') ?? ''
    const t = menuStrings('en')
    fireEvent.click(screen.getByRole('button', { name: t.increase }))

    // assert: total 15.00 after Small, then 30.00 for 2
    expect(textAfterSmall).toContain(money(1500))
    const updatedText =
      container.querySelector('.menu-item-view-breakdown')?.textContent?.replace(/\s+/g, ' ') ?? ''
    expect(updatedText).toContain(money(3000))
  })

  it('blocks add to cart until required options are chosen', () => {
    // arrange: render (no Size picked)
    const onAdd = vi.fn()
    render(
      <ItemView
        item={latte}
        currency="QAR"
        locale="en"
        onClose={vi.fn()}
        ordering={{ showPrices: true, onAdd }}
      />,
    )
    const t = menuStrings('en')

    // act: try Add to cart, then pick Large and click it
    const missingGroup = screen.getByRole('button', {
      name: t.chooseA.replace('{group}', 'Size'),
    })
    expect(missingGroup).toHaveProperty('disabled', true)
    fireEvent.click(missingGroup)

    fireEvent.click(screen.getByRole('radio', { name: /Large/ }))
    const addButton = screen.getByRole('button', { name: t.addToCart })
    expect(addButton).toHaveProperty('disabled', false)
    fireEvent.click(addButton)

    // assert: disabled first, saying "Choose a Size"; then onAdd called once with
    //   { itemId, optionIds: [Large's id], quantity: 1 }
    expect(onAdd).toHaveBeenCalledTimes(1)
    expect(onAdd).toHaveBeenCalledWith({
      itemId: latte.id,
      optionIds: ['large'],
      quantity: 1,
    })
  })
})
