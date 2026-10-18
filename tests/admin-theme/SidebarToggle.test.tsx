// @vitest-environment jsdom
// The document bar button opens the edit view's sidebar as a floating panel and closes it again.
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  SIDEBAR_OPEN_ATTRIBUTE,
  SIDEBAR_STORAGE_KEY,
  SidebarToggle,
} from '@/common/components/SidebarToggle/SidebarToggle'

describe('SidebarToggle', () => {
  afterEach(() => {
    // cleanup(), localStorage.clear(), remove data-doc-sidebar from <html>, restore storage mocks
    cleanup()
    localStorage.clear()
    document.documentElement.removeAttribute(SIDEBAR_OPEN_ATTRIBUTE)
    vi.restoreAllMocks()
  })

  it('starts closed', () => {
    // arrange: empty localStorage
    localStorage.clear()

    // act: render <SidebarToggle />
    render(<SidebarToggle />)

    // assert: button "Show sidebar" with aria-pressed false; <html> has no data-doc-sidebar
    const button = screen.getByRole('button', { name: 'Show sidebar' })
    expect(button.getAttribute('aria-pressed')).toBe('false')
    expect(document.documentElement.hasAttribute(SIDEBAR_OPEN_ATTRIBUTE)).toBe(false)
  })

  it('opens the sidebar on click', () => {
    // arrange: render <SidebarToggle />
    render(<SidebarToggle />)

    // act: click "Show sidebar"
    fireEvent.click(screen.getByRole('button', { name: 'Show sidebar' }))

    // assert: <html data-doc-sidebar="open">; button "Hide sidebar", aria-pressed and aria-expanded true
    expect(document.documentElement.getAttribute(SIDEBAR_OPEN_ATTRIBUTE)).toBe('open')
    const button = screen.getByRole('button', { name: 'Hide sidebar' })
    expect(button.getAttribute('aria-pressed')).toBe('true')
    expect(button.getAttribute('aria-expanded')).toBe('true')
  })

  it('closes it on a second click', () => {
    // arrange: render, click once (open)
    render(<SidebarToggle />)
    fireEvent.click(screen.getByRole('button', { name: 'Show sidebar' }))

    // act: click "Hide sidebar"
    fireEvent.click(screen.getByRole('button', { name: 'Hide sidebar' }))

    // assert: no data-doc-sidebar on <html>; button "Show sidebar"
    expect(document.documentElement.hasAttribute(SIDEBAR_OPEN_ATTRIBUTE)).toBe(false)
    expect(screen.getByRole('button', { name: 'Show sidebar' })).toBeDefined()
  })

  it('closes it on Escape', () => {
    // arrange: render, click once (open)
    render(<SidebarToggle />)
    fireEvent.click(screen.getByRole('button', { name: 'Show sidebar' }))

    // act: keydown Escape on document
    fireEvent.keyDown(document, { key: 'Escape' })

    // assert: no data-doc-sidebar on <html>; button "Show sidebar"
    expect(document.documentElement.hasAttribute(SIDEBAR_OPEN_ATTRIBUTE)).toBe(false)
    expect(screen.getByRole('button', { name: 'Show sidebar' })).toBeDefined()
  })

  it('closes it on a click outside the panel', () => {
    // arrange: render the toggle next to a panel (`.document-fields__sidebar-wrap`) and a dimmed
    //   form (`.document-fields`), click once (open)
    render(
      <>
        <SidebarToggle />
        <div className="document-fields">
          <div className="document-fields__sidebar-wrap">
            <span data-testid="inside" />
          </div>
          <div data-testid="form" />
        </div>
      </>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Show sidebar' }))

    // act: pointerdown on the form
    fireEvent.pointerDown(screen.getByTestId('form'))

    // assert: no data-doc-sidebar on <html>; button "Show sidebar"; localStorage 'closed'
    expect(document.documentElement.hasAttribute(SIDEBAR_OPEN_ATTRIBUTE)).toBe(false)
    expect(screen.getByRole('button', { name: 'Show sidebar' })).toBeDefined()
    expect(localStorage.getItem(SIDEBAR_STORAGE_KEY)).toBe('closed')
  })

  it('stays open on a click inside the panel', () => {
    // arrange: same markup, click once (open)
    render(
      <>
        <SidebarToggle />
        <div className="document-fields">
          <div className="document-fields__sidebar-wrap">
            <span data-testid="inside" />
          </div>
          <div data-testid="form" />
        </div>
      </>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Show sidebar' }))

    // act: pointerdown on an element inside the panel
    fireEvent.pointerDown(screen.getByTestId('inside'))

    // assert: <html data-doc-sidebar="open">; button "Hide sidebar"
    expect(document.documentElement.getAttribute(SIDEBAR_OPEN_ATTRIBUTE)).toBe('open')
    expect(screen.getByRole('button', { name: 'Hide sidebar' })).toBeDefined()
  })

  it('remembers the choice', () => {
    // arrange: render, click once (open), unmount
    const { unmount } = render(<SidebarToggle />)
    fireEvent.click(screen.getByRole('button', { name: 'Show sidebar' }))
    unmount()

    // act: render <SidebarToggle /> again
    render(<SidebarToggle />)

    // assert: localStorage 'admin-doc-sidebar' is 'open'; button "Hide sidebar"; <html> open
    expect(localStorage.getItem(SIDEBAR_STORAGE_KEY)).toBe('open')
    expect(screen.getByRole('button', { name: 'Hide sidebar' })).toBeDefined()
    expect(document.documentElement.getAttribute(SIDEBAR_OPEN_ATTRIBUTE)).toBe('open')
  })

  it('unlocks the page when it unmounts', () => {
    // arrange: render, click once (open)
    const { unmount } = render(<SidebarToggle />)
    fireEvent.click(screen.getByRole('button', { name: 'Show sidebar' }))

    // act: unmount
    unmount()

    // assert: no data-doc-sidebar on <html>
    expect(document.documentElement.hasAttribute(SIDEBAR_OPEN_ATTRIBUTE)).toBe(false)
  })

  it('labels the action for screen readers', () => {
    // arrange: render <SidebarToggle />
    render(<SidebarToggle />)

    // act: (none)

    // assert: the one button is named "Show sidebar", its icon is aria-hidden
    const button = screen.getByRole('button', { name: 'Show sidebar' })
    expect(screen.getAllByRole('button')).toEqual([button])
    expect(button.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('stays closed when storage fails', () => {
    // arrange: localStorage.getItem and setItem throw (vi.spyOn on Storage.prototype)
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })

    // act: render, then click
    render(<SidebarToggle />)
    const button = screen.getByRole('button', { name: 'Show sidebar' })
    fireEvent.click(button)

    // assert: renders "Show sidebar" without throwing; the click still opens it in the page
    expect(screen.getByRole('button', { name: 'Hide sidebar' })).toBeDefined()
    expect(document.documentElement.getAttribute(SIDEBAR_OPEN_ATTRIBUTE)).toBe('open')
  })

  // a relationship's doc drawer has its own document bar and sidebar (user, 2026-10-18: the
  // drawer's ✕ moved when its panel opened, because the page behind was locked)
  describe('in a drawer', () => {
    const Drawer = ({ testId }: { testId: string }) => (
      <div className="payload__modal-container">
        <div className="payload__modal-item drawer">
          <div className="drawer__content" data-testid={testId}>
            <div className="doc-controls">
              <SidebarToggle />
            </div>
            <div className="document-fields">
              <div className="document-fields__sidebar-wrap" />
              <div data-testid={`${testId}-form`} />
            </div>
          </div>
        </div>
      </div>
    )

    it('opens its own drawer, not the page', () => {
      // arrange: a toggle inside a drawer
      render(<Drawer testId="drawer" />)

      // act: click "Show sidebar"
      fireEvent.click(screen.getByRole('button', { name: 'Show sidebar' }))

      // assert: the drawer's content is open, <html> is not (the page stays unlocked)
      expect(screen.getByTestId('drawer').getAttribute(SIDEBAR_OPEN_ATTRIBUTE)).toBe('open')
      expect(document.documentElement.hasAttribute(SIDEBAR_OPEN_ATTRIBUTE)).toBe(false)
    })

    it("closes on a click on the drawer's form", () => {
      // arrange: a toggle inside a drawer, opened
      render(<Drawer testId="drawer" />)
      fireEvent.click(screen.getByRole('button', { name: 'Show sidebar' }))

      // act: pointerdown on the drawer's dimmed form
      fireEvent.pointerDown(screen.getByTestId('drawer-form'))

      // assert: closed, button "Show sidebar"
      expect(screen.getByTestId('drawer').hasAttribute(SIDEBAR_OPEN_ATTRIBUTE)).toBe(false)
      expect(screen.getByRole('button', { name: 'Show sidebar' })).toBeDefined()
    })

    it('keeps the page panel open on a click in a drawer', () => {
      // arrange: the page's toggle, opened, and a drawer over the page
      render(
        <>
          <div data-testid="page">
            <SidebarToggle />
          </div>
          <Drawer testId="drawer" />
        </>,
      )
      const page = within(screen.getByTestId('page'))
      fireEvent.click(page.getByRole('button', { name: 'Show sidebar' }))

      // act: pointerdown on the drawer's form
      fireEvent.pointerDown(screen.getByTestId('drawer-form'))

      // assert: the page's panel is still open
      expect(document.documentElement.getAttribute(SIDEBAR_OPEN_ATTRIBUTE)).toBe('open')
    })
  })
})
