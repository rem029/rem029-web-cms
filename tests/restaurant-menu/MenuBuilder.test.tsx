// @vitest-environment jsdom
// The menu builder (rem0017 phase 2 step 2, `src/collections/Menus/components/MenuBuilder.tsx`):
// the Items tab of a menu. Outside edges mocked: `@payloadcms/ui` (the form's `items` and `tenant`
// through useFormFields, useForm, useLocale) and the server actions module (`components/actions.ts`).
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { BuilderItem } from '@/collections/Menus/components/builderTypes'
import { MenuBuilder } from '@/collections/Menus/components/MenuBuilder'

const state = vi.hoisted(() => ({
  items: [] as number[],
  dispatch: vi.fn(),
}))

type FormFields = Record<string, { value: unknown }>

const actions = vi.hoisted(() => ({
  listBuilderItemsAction: vi.fn(),
  listItemsOfCategoryAction: vi.fn(),
  quickUpdateItemAction: vi.fn(),
  getItemFormAction: vi.fn(),
  saveItemAction: vi.fn(),
  listBuilderCategoriesAction: vi.fn(),
  saveCategoryAction: vi.fn(),
  reorderCategoriesAction: vi.fn(),
  listLookupsAction: vi.fn(),
  uploadItemImageAction: vi.fn(),
}))

vi.mock('@payloadcms/ui', () => ({
  useFormFields: <T,>(selector: (context: [FormFields, typeof state.dispatch]) => T): T =>
    selector([{ items: { value: state.items }, tenant: { value: 1 } }, state.dispatch]),
  useForm: () => ({ setModified: vi.fn() }),
  useLocale: () => ({ code: 'en' }),
}))

const OFFLINE = "Couldn't reach the server. Check your connection and try again."

/** What the builder wrote to the form's `items` field. */
const itemsSetTo = (ids: number[]) => ({ type: 'UPDATE', path: 'items', value: ids })

vi.mock('@/collections/Menus/components/actions', () => actions)

const row = (id: number, title: string, data: Partial<BuilderItem> = {}): BuilderItem => ({
  id,
  title,
  slug: title.toLowerCase(),
  price: 10,
  categoryId: null,
  categoryTitle: null,
  imageUrl: null,
  inStock: true,
  isActive: true,
  ...data,
})

const a = row(1, 'Soup')
const b = row(2, 'Steak')
const c = row(3, 'Salad')

const listItems = (items: BuilderItem[]) =>
  actions.listBuilderItemsAction.mockResolvedValue({ ok: true, items, currency: 'USD' })

describe('MenuBuilder', () => {
  beforeEach(() => {
    actions.listBuilderCategoriesAction.mockResolvedValue({
      ok: true,
      categories: [{ id: 10, title: 'Starters', sortOrder: 1, itemCount: 3 }],
    })
    actions.listLookupsAction.mockResolvedValue({ ok: true, allergens: [], tags: [] })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    state.items = []
  })

  it('ticks the items already on the menu', async () => {
    // arrange
    state.items = [a.id]
    listItems([a, b])

    // act
    render(<MenuBuilder />)

    // assert
    const onA = await screen.findByRole('checkbox', { name: 'On this menu: Soup' })
    const onB = screen.getByRole('checkbox', { name: 'On this menu: Steak' })
    expect(onA).toHaveProperty('checked', true)
    expect(onB).toHaveProperty('checked', false)
  })

  it('adds an item to the menu when ticked', async () => {
    // arrange
    listItems([a])
    render(<MenuBuilder />)

    // act
    fireEvent.click(await screen.findByRole('checkbox', { name: 'On this menu: Soup' }))

    // assert
    expect(state.dispatch).toHaveBeenCalledWith(itemsSetTo([a.id]))
  })

  it('removes an item when unticked', async () => {
    // arrange
    state.items = [a.id, b.id]
    listItems([a, b])
    render(<MenuBuilder />)

    // act
    fireEvent.click(await screen.findByRole('checkbox', { name: 'On this menu: Soup' }))

    // assert
    expect(state.dispatch).toHaveBeenCalledWith(itemsSetTo([b.id]))
  })

  it('adds every item of a category at once', async () => {
    // arrange
    state.items = [a.id]
    listItems([a, b, c])
    actions.listItemsOfCategoryAction.mockResolvedValue({ ok: true, itemIds: [a.id, b.id, c.id] })
    render(<MenuBuilder />)

    // act
    fireEvent.click(await screen.findByRole('button', { name: 'Add all Starters to this menu' }))

    // assert
    await vi.waitFor(() =>
      expect(state.dispatch).toHaveBeenCalledWith(itemsSetTo([a.id, b.id, c.id])),
    )
  })

  it('shows an empty state with a new item button', async () => {
    // arrange
    listItems([])

    // act
    render(<MenuBuilder />)

    // assert
    expect(await screen.findByText('Add your first item')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'New item' }).length).toBeGreaterThan(0)
  })

  it('shows the saved price after an inline edit', async () => {
    // arrange
    listItems([a])
    actions.quickUpdateItemAction.mockResolvedValue({ ok: true, item: { ...a, price: 12 } })
    render(<MenuBuilder />)
    const price = await screen.findByRole('spinbutton', { name: 'Price: Soup' })

    // act
    fireEvent.change(price, { target: { value: '12' } })
    fireEvent.blur(price)

    // assert
    const rowOfA = price.closest('tr')
    expect(rowOfA).not.toBeNull()
    expect(await within(rowOfA as HTMLElement).findByText('Saved')).toBeTruthy()
    expect(price).toHaveProperty('value', '12')
  })

  it('shows the error when a quick edit fails', async () => {
    // arrange
    listItems([a])
    actions.quickUpdateItemAction.mockResolvedValue({
      ok: false,
      error: 'You can only edit items of this business.',
    })
    render(<MenuBuilder />)
    const stock = await screen.findByRole('checkbox', { name: 'In stock: Soup' })

    // act
    fireEvent.click(stock)

    // assert
    expect(await screen.findByText('You can only edit items of this business.')).toBeTruthy()
    expect(stock).toHaveProperty('checked', true)
  })

  it('shows an error when the items fail to load', async () => {
    // arrange: the items action rejects (the request never got an answer)
    actions.listBuilderItemsAction.mockRejectedValue(new Error('Failed to fetch'))

    // act
    render(<MenuBuilder />)

    // assert
    expect(await screen.findByText(OFFLINE)).toBeTruthy()
  })

  it('shows an error when a quick edit fails to send', async () => {
    // arrange
    listItems([a])
    actions.quickUpdateItemAction.mockRejectedValue(new Error('Failed to fetch'))
    render(<MenuBuilder />)
    const stock = await screen.findByRole('checkbox', { name: 'In stock: Soup' })

    // act
    fireEvent.click(stock)

    // assert
    expect(await screen.findByText(OFFLINE)).toBeTruthy()
    expect(stock).toHaveProperty('checked', true)
  })
})
