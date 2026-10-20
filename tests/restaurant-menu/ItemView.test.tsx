// @vitest-environment jsdom
// An item's detail view on the guest menu (rem0017 phase 3 step 3, `src/app/(frontend)/menu/
// _components/ItemView.tsx`): read-only until rem0018 adds ordering.
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ItemView } from '@/app/(frontend)/menu/_components/ItemView'
import { formatPrice } from '@/common/utils/formatPrice'

import { guestItem } from './guestItems'

const view = (item = guestItem()) =>
  render(<ItemView item={item} currency="QAR" locale="en" onClose={vi.fn()} />)

describe('ItemView', () => {
  afterEach(cleanup)

  it('shows the price in the tenant currency', () => {
    // arrange
    const item = guestItem({ title: 'Soup', price: 12.5 })

    // act
    view(item)

    // assert (Testing Library collapses the rendered non-breaking space, so the expected text too)
    expect(screen.getByText(formatPrice(12.5, 'QAR', 'en').replace(/\s+/g, ' '))).toBeTruthy()
  })

  it('lists options read only', () => {
    // arrange
    const item = guestItem({
      modifierGroups: [
        {
          name: 'Size',
          inputType: 'radio',
          required: true,
          options: [
            { label: 'Small', price: null },
            { label: 'Large', price: null },
          ],
        },
      ],
    })

    // act
    view(item)

    // assert
    expect(screen.getByText('Size')).toBeTruthy()
    expect(screen.getByText('Small')).toBeTruthy()
    expect(screen.getByText('Large')).toBeTruthy()
    expect(screen.queryAllByRole('radio')).toHaveLength(0)
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
  })

  // rem0018 phase 1 step 1a
  it('shows the extra price of a choice', () => {
    // arrange: Size with Small (price null) and Large (price 2)
    const item = guestItem({
      modifierGroups: [
        {
          name: 'Size',
          inputType: 'radio',
          required: true,
          options: [
            { label: 'Small', price: null },
            { label: 'Large', price: 2 },
          ],
        },
      ],
    })

    // act: view(item)
    view(item)

    // assert: '+ ' + formatPrice(2, 'QAR', 'en') is shown next to Large
    const expected = ('+ ' + formatPrice(2, 'QAR', 'en')).replace(/\s+/g, ' ')
    expect(screen.getByText(expected)).toBeTruthy()
  })

  it('shows no price for a free choice', () => {
    // arrange: Size with Small (price null) only
    const item = guestItem({
      modifierGroups: [
        {
          name: 'Size',
          inputType: 'radio',
          required: true,
          options: [{ label: 'Small', price: null }],
        },
      ],
    })

    // act: view(item)
    const { container } = view(item)

    // assert: no text starting with '+' in the options section
    const optionsSection = container.querySelector('.menu-item-view-options')
    expect(optionsSection?.textContent).not.toContain('+')
  })

  it('lists allergens and tags', () => {
    // arrange
    const item = guestItem({
      allergens: [{ id: 1, title: 'Nuts' }],
      tags: [{ id: 2, title: 'Vegan' }],
    })

    // act
    view(item)

    // assert
    expect(screen.getByText('Nuts')).toBeTruthy()
    expect(screen.getByText('Vegan')).toBeTruthy()
  })
})
