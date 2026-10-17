// @vitest-environment jsdom
// Search on the guest menu (rem0017 phase 3 step 3, `src/app/(frontend)/menu/_components/
// SearchOverlay.tsx`). Outside edge mocked: searchMenuItemsAction.
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SearchOverlay } from '@/app/(frontend)/menu/_components/SearchOverlay'

import { guestItem } from './guestItems'

const { searchMenuItemsAction } = vi.hoisted(() => ({ searchMenuItemsAction: vi.fn() }))
vi.mock('@/app/(frontend)/menu/_actions', () => ({ searchMenuItemsAction }))

const open = () =>
  render(
    <SearchOverlay menuId={1} currency="USD" locale="en" onOpenItem={vi.fn()} onClose={vi.fn()} />,
  )

describe('SearchOverlay', () => {
  afterEach(() => {
    cleanup()
    searchMenuItemsAction.mockReset()
  })

  it('shows matching items after typing', async () => {
    // arrange
    searchMenuItemsAction.mockResolvedValue({ ok: true, items: [guestItem({ title: 'Soup' })] })
    open()

    // act
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'sou' } })

    // assert (findBy waits past the debounce)
    expect(await screen.findByText('Soup')).toBeTruthy()
    expect(searchMenuItemsAction).toHaveBeenCalledWith({ menuId: 1, query: 'sou', locale: 'en' })
  })

  it('shows a no results message', async () => {
    // arrange
    searchMenuItemsAction.mockResolvedValue({ ok: true, items: [] })
    open()

    // act
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzz' } })

    // assert
    expect(await screen.findByText('No results')).toBeTruthy()
  })
})
