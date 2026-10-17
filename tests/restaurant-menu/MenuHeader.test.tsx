// @vitest-environment jsdom
// The menu pages' header (rem0017 phase 3, `src/app/(frontend)/menu/_components/MenuHeader.tsx`):
// the menu pages don't use the site Header (they sit outside the `(site)` route group).
// Outside edge mocked: next/navigation (used by the language switch).
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { MenuHeader } from '@/app/(frontend)/menu/_components/MenuHeader'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/menu/dinner',
}))

describe('MenuHeader', () => {
  afterEach(cleanup)

  it('shows the title linking home', () => {
    // act
    render(<MenuHeader title="Dinner" logo={null} homeHref="/menu" showLanguageSwitch={false} />)

    // assert
    expect(screen.getByRole('link', { name: 'Dinner' }).getAttribute('href')).toBe('/menu')
  })

  it('shows the language switch when the menu enables it', () => {
    // act
    const { unmount } = render(
      <MenuHeader title="Dinner" logo={null} homeHref="/menu" showLanguageSwitch />,
    )
    const shown = screen.queryAllByRole('link', { name: /^(EN|AR)$/ }).length
    unmount()
    render(<MenuHeader title="Dinner" logo={null} homeHref="/menu" showLanguageSwitch={false} />)
    const hidden = screen.queryAllByRole('link', { name: /^(EN|AR)$/ }).length

    // assert
    expect(shown).toBe(2)
    expect(hidden).toBe(0)
  })
})
