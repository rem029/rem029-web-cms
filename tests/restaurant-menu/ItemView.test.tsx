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

    // assert
    expect(screen.getByText(formatPrice(12.5, 'QAR', 'en'))).toBeTruthy()
  })

  it('lists options read only', () => {
    // arrange
    const item = guestItem({
      modifierGroups: [
        { name: 'Size', inputType: 'radio', required: true, options: ['Small', 'Large'] },
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
