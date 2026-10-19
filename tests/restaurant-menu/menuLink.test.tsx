// @vitest-environment jsdom
// CMSLink to a menu (rem0017 phase 3 step 5, `src/components/Link/index.tsx`): an internal link
// to a menu renders as `/menu/<slug>`.
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CMSLink } from '@/components/Link'
import type { Menu } from '@/payload-types'

vi.mock('next/compat/router', () => ({ useRouter: () => null }))

describe('CMSLink to a menu', () => {
  afterEach(cleanup)

  it('links "Our menus" to the menu list', () => {
    // arrange: type 'menus', no reference
    // act: render <CMSLink type="menus" label="Our menus" />
    render(<CMSLink type="menus" label="Our menus" />)
    const link = screen.getByText('Our menus').closest('a')

    // assert: the link's href is '/menu'
    expect(link?.getAttribute('href')).toBe('/menu')
  })

  it('links a menu to its menu page', () => {
    // arrange: type 'reference', reference { relationTo: 'menus', value: { slug: 'corniche' } }
    const menu: Menu = {
      id: 1,
      title: 'Corniche',
      slug: 'corniche',
      updatedAt: '2026-10-19T00:00:00.000Z',
      createdAt: '2026-10-19T00:00:00.000Z',
    }

    // act: render <CMSLink label="Our menu" … />
    render(
      <CMSLink
        type="reference"
        label="Our menu"
        reference={{ relationTo: 'menus', value: menu }}
      />,
    )
    const link = screen.getByText('Our menu').closest('a')

    // assert: the link's href is '/menu/corniche'
    expect(link?.getAttribute('href')).toBe('/menu/corniche')
  })

  it("leaves a menu the reader can't see without an address", () => {
    // arrange: reference { relationTo: 'menus', value: 12 } (not populated: unpublished menu)
    // act: render
    render(
      <CMSLink type="reference" label="Our menu" reference={{ relationTo: 'menus', value: 12 }} />,
    )
    const link = screen.getByText('Our menu').closest('a')

    // assert: no '/menu/' href (empty href, label still shown)
    expect(link?.getAttribute('href')).toBe('')
    expect(screen.getByText('Our menu')).toBeDefined()
  })
})
