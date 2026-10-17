// @vitest-environment jsdom
// The document bar button opens the edit view's sidebar as a floating panel and closes it again.
import { afterEach, describe, expect, it } from 'vitest'

describe('SidebarToggle', () => {
  afterEach(() => {
    // cleanup(), localStorage.clear(), remove data-doc-sidebar from <html>, restore storage mocks
  })

  it('starts closed', () => {
    // arrange: empty localStorage
    // act: render <SidebarToggle />
    // assert: button "Show sidebar" with aria-pressed false; <html> has no data-doc-sidebar
    expect.fail('not implemented')
  })

  it('opens the sidebar on click', () => {
    // arrange: render <SidebarToggle />
    // act: click "Show sidebar"
    // assert: <html data-doc-sidebar="open">; button "Hide sidebar", aria-pressed and aria-expanded true
    expect.fail('not implemented')
  })

  it('closes it on a second click', () => {
    // arrange: render, click once (open)
    // act: click "Hide sidebar"
    // assert: no data-doc-sidebar on <html>; button "Show sidebar"
    expect.fail('not implemented')
  })

  it('closes it on Escape', () => {
    // arrange: render, click once (open)
    // act: keydown Escape on document
    // assert: no data-doc-sidebar on <html>; button "Show sidebar"
    expect.fail('not implemented')
  })

  it('remembers the choice', () => {
    // arrange: render, click once (open), unmount
    // act: render <SidebarToggle /> again
    // assert: localStorage 'admin-doc-sidebar' is 'open'; button "Hide sidebar"; <html> open
    expect.fail('not implemented')
  })

  it('unlocks the page when it unmounts', () => {
    // arrange: render, click once (open)
    // act: unmount
    // assert: no data-doc-sidebar on <html>
    expect.fail('not implemented')
  })

  it('labels the action for screen readers', () => {
    // arrange: render <SidebarToggle />
    // act: (none)
    // assert: the one button is named "Show sidebar", its icon is aria-hidden
    expect.fail('not implemented')
  })

  it('stays closed when storage fails', () => {
    // arrange: localStorage.getItem and setItem throw (vi.spyOn on Storage.prototype)
    // act: render, then click
    // assert: renders "Show sidebar" without throwing; the click still opens it in the page
    expect.fail('not implemented')
  })
})
