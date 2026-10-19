// @vitest-environment jsdom
// The menu pages' own footer (rem0017 phase 3, `src/app/(frontend)/menu/_components/MenuFooter.tsx`),
// in place of the site Footer.
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { MenuFooter } from '@/app/(frontend)/menu/_components/MenuFooter'
import type { Setting } from '@/payload-types'

const NOW = '2026-10-17T00:00:00.000Z'

const settings = (data: Partial<Setting> = {}): Setting => ({
  id: 1,
  siteName: 'Cafe Test',
  updatedAt: NOW,
  createdAt: NOW,
  ...data,
})

describe('MenuFooter', () => {
  afterEach(cleanup)

  it('shows the business name, phone and address', () => {
    // arrange
    const doc = settings({
      contact: { phone: '+974 5555 0000' },
      address: { full_address: 'Corniche Street, Doha' },
    })

    // act
    render(<MenuFooter settings={doc} locale="en" />)

    // assert
    expect(screen.getByText('Cafe Test')).toBeTruthy()
    expect(screen.getByRole('link', { name: '+974 5555 0000' }).getAttribute('href')).toBe(
      'tel:+974 5555 0000',
    )
    expect(screen.getByText('Corniche Street, Doha')).toBeTruthy()
  })

  it('leaves out contact rows without a value', () => {
    // act
    const { container } = render(<MenuFooter settings={settings()} locale="en" />)

    // assert
    expect(screen.getByText('Cafe Test')).toBeTruthy()
    expect(container.querySelector('a[href^="tel:"]')).toBeNull()
  })

  it('links to all menus in arabic', () => {
    // act
    render(
      <div dir="rtl">
        <MenuFooter settings={settings()} locale="ar" />
      </div>,
    )

    // assert
    expect(screen.getByRole('link', { name: 'كل القوائم' }).getAttribute('href')).toBe('/menu')
  })
})
