// @vitest-environment jsdom
// A menu on the /menu list (rem0017 phase 3 step 2, `src/app/(frontend)/menu/_components/MenuCard.tsx`).
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { MenuCard, type MenuCardProps } from '@/app/(frontend)/menu/_components/MenuCard'

const menu = (data: Partial<MenuCardProps['menu']> = {}): MenuCardProps['menu'] => ({
  title: 'Dinner',
  slug: 'dinner',
  ...data,
})

// physical spacing or alignment classes, which don't flip in arabic
const PHYSICAL = /(^|\s)-?(ml|mr|pl|pr|left|right|text-left|text-right)-/

describe('MenuCard', () => {
  afterEach(cleanup)

  it('links to the menu page', () => {
    // act
    render(<MenuCard menu={menu()} />)

    // assert
    expect(screen.getByRole('link').getAttribute('href')).toBe('/menu/dinner')
  })

  it('shows the intro heading', () => {
    // act
    render(<MenuCard menu={menu({ intro: { heading: 'Fresh every day' } })} />)

    // assert
    expect(screen.getByText('Fresh every day')).toBeTruthy()
  })

  it('renders right-to-left in arabic', () => {
    // arrange
    const { container } = render(
      <div dir="rtl">
        <MenuCard menu={menu({ title: 'العشاء' })} />
      </div>,
    )

    // act
    const classes = Array.from(container.querySelectorAll('[class]')).map((el) =>
      el.getAttribute('class'),
    )

    // assert
    expect(screen.getByText('العشاء')).toBeTruthy()
    expect(classes.filter((value) => PHYSICAL.test(value ?? ''))).toEqual([])
  })
})
