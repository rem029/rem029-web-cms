// @vitest-environment jsdom
// The guest menu (rem0017 phase 3 step 3, `src/app/(frontend)/menu/_components/Menu.tsx`): sections
// from buildMenuSections, category nav, filters as the menu enables them, out-of-stock state,
// shareable url. Outside edges mocked: the frontend server actions module, scrollIntoView (jsdom
// has none; IntersectionObserver is missing too, so scrolling marks nothing).
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Menu, type MenuProps } from '@/app/(frontend)/menu/_components/Menu'
import { menuStrings } from '@/app/(frontend)/menu/_i18n'

import { guestItem, section } from './guestItems'

vi.mock('@/app/(frontend)/menu/_actions', () => ({ searchMenuItemsAction: vi.fn() }))

const GLUTEN = { id: 901, title: 'Gluten' }

const sections = () => [
  section('starters', 'Starters', [
    guestItem({ slug: 'soup', title: 'Soup', allergens: [GLUTEN], availability: ['lunch'] }),
  ]),
  section('mains', 'Mains', [
    guestItem({ slug: 'steak', title: 'Steak', availability: ['dinner'] }),
  ]),
]

const ALL_FILTERS = { showSearch: true, showAllergens: true, showAvailability: true }

const renderMenu = (props: Partial<MenuProps> = {}) =>
  render(
    <Menu
      menuId={1}
      sections={sections()}
      currency="USD"
      locale="en"
      filters={ALL_FILTERS}
      {...props}
    />,
  )

// physical spacing or alignment classes, which don't flip in arabic
const PHYSICAL = /(^|\s)-?(ml|mr|pl|pr|left|right|text-left|text-right)-/

const scrollIntoView = vi.fn()

describe('Menu', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = scrollIntoView
    window.history.replaceState(null, '', '/menu/all-day')
  })

  afterEach(() => {
    cleanup()
    scrollIntoView.mockClear()
    vi.restoreAllMocks()
  })

  it('lists items under their category', () => {
    // act
    renderMenu()

    // assert
    const starters = screen.getByRole('region', { name: 'Starters' })
    const mains = screen.getByRole('region', { name: 'Mains' })
    expect(within(starters).getByText('Soup')).toBeTruthy()
    expect(within(mains).getByText('Steak')).toBeTruthy()
    expect(within(starters).queryByText('Steak')).toBeNull()
  })

  it('jumps to a category from the nav', () => {
    // arrange
    renderMenu()
    const nav = screen.getByRole('navigation', { name: 'Categories' })

    // act
    fireEvent.click(within(nav).getByRole('button', { name: 'Mains' }))

    // assert
    expect(scrollIntoView.mock.contexts).toContain(screen.getByRole('region', { name: 'Mains' }))
    expect(within(nav).getByRole('button', { name: 'Mains' }).getAttribute('aria-current')).toBe(
      'true',
    )
  })

  it('filters items by allergen', () => {
    // arrange
    renderMenu()

    // act
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    fireEvent.click(screen.getByRole('button', { name: 'Gluten' }))

    // assert
    expect(screen.getByText('Soup')).toBeTruthy()
    expect(screen.queryByText('Steak')).toBeNull()
  })

  it('filters items by availability', () => {
    // arrange
    renderMenu()

    // act
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    fireEvent.click(screen.getByRole('button', { name: 'Dinner' }))

    // assert
    expect(screen.getByText('Steak')).toBeTruthy()
    expect(screen.queryByText('Soup')).toBeNull()
  })

  it('hides the filters the menu turned off', () => {
    // act
    renderMenu({ filters: { showSearch: false, showAllergens: false, showAvailability: false } })

    // assert
    expect(screen.queryByRole('button', { name: 'Search the menu' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Filters' })).toBeNull()
  })

  it('marks out of stock items', () => {
    // arrange
    const menu = [section('mains', 'Mains', [guestItem({ title: 'Steak', inStock: false })])]

    // act
    renderMenu({ sections: menu })

    // assert
    const card = screen.getByRole('button', { name: /Steak/ })
    expect(within(card).getByText('Out of stock')).toBeTruthy()
  })

  it('opens the item from a shared link', () => {
    // act
    renderMenu({ initial: { itemSlug: 'soup' } })

    // assert
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Soup' })).toBeTruthy()
  })

  it('writes the picked filters to the url', () => {
    // arrange
    const replaceState = vi.spyOn(window.history, 'replaceState')
    renderMenu()

    // act
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    fireEvent.click(screen.getByRole('button', { name: 'Dinner' }))

    // assert
    const url = String(replaceState.mock.calls.at(-1)?.[2])
    expect(new URL(url, 'http://localhost').searchParams.get('period')).toBe('dinner')
  })

  it('renders right-to-left in arabic', () => {
    // arrange
    const t = menuStrings('ar')
    const menu = [
      section('mains', 'الأطباق الرئيسية', [guestItem({ title: 'ستيك', inStock: false })]),
    ]

    // act
    const { container } = render(
      <div dir="rtl">
        <Menu menuId={1} sections={menu} currency="QAR" locale="ar" filters={ALL_FILTERS} />
      </div>,
    )

    // assert
    expect(screen.getByRole('region', { name: 'الأطباق الرئيسية' })).toBeTruthy()
    expect(screen.getByText(t.outOfStock)).toBeTruthy()
    expect(screen.getByRole('button', { name: t.filters })).toBeTruthy()
    const classes = Array.from(container.querySelectorAll('[class]')).map((el) =>
      el.getAttribute('class'),
    )
    expect(classes.filter((value) => PHYSICAL.test(value ?? ''))).toEqual([])
  })
})
