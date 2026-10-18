// @vitest-environment jsdom
// The admin provider puts the theme script ahead of the page, so it runs before anything paints.
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/font/google', () => ({
  Geist: () => ({ style: { fontFamily: 'Geist' } }),
  JetBrains_Mono: () => ({ style: { fontFamily: 'JetBrains_Mono' } }),
  Space_Grotesk: () => ({ style: { fontFamily: 'Space_Grotesk' } }),
}))

import { AdminTheme } from '@/common/components/AdminTheme/AdminTheme'

describe('AdminTheme', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders the theme script before the page', () => {
    // arrange: render <AdminTheme><main data-testid="page" /></AdminTheme>
    const { container, getByTestId } = render(
      <AdminTheme>
        <main data-testid="page" />
      </AdminTheme>,
    )

    // act: find the <script> and the page element in the container
    const script = container.querySelector('script')
    const page = getByTestId('page')

    // assert: the script exists, holds the device check, and comes before the page
    //   (compareDocumentPosition: DOCUMENT_POSITION_FOLLOWING). The query string, not the function
    //   name: the production build minifies names
    expect(script).not.toBeNull()
    expect(script?.textContent).toContain('prefers-color-scheme: dark')
    expect(
      Boolean(script && script.compareDocumentPosition(page) & Node.DOCUMENT_POSITION_FOLLOWING),
    ).toBe(true)
  })
})
