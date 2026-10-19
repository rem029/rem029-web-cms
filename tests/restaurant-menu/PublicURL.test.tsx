// @vitest-environment jsdom
// The "Public URL" field on a menu's edit view (rem0017 phase 3 step 5,
// `src/collections/Menus/components/PublicURL.tsx`). Outside edges mocked: `@payloadcms/ui`
// (useDocumentInfo: id, savedDocumentData, hasPublishedDoc) and the server actions module.
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PublicURL } from '@/collections/Menus/components/PublicURL'

const docInfo = vi.hoisted(() => ({
  id: undefined as number | string | undefined,
  savedDocumentData: undefined as { updatedAt?: string } | undefined,
  hasPublishedDoc: false,
}))

const actions = vi.hoisted(() => ({
  getMenuPublicURLAction: vi.fn(),
}))

vi.mock('@payloadcms/ui', () => ({
  useDocumentInfo: () => docInfo,
}))

vi.mock('@/collections/Menus/components/actions', () => actions)

describe('PublicURL', () => {
  beforeEach(() => {
    docInfo.id = undefined
    docInfo.savedDocumentData = undefined
    docInfo.hasPublishedDoc = false
    actions.getMenuPublicURLAction.mockReset()
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('asks to save the menu before it has an address', () => {
    // arrange: no document id (create view, not saved yet)
    docInfo.id = undefined

    // act: render <PublicURL />
    render(<PublicURL />)

    // assert: "Save the menu to get its address." shown, the action not called
    expect(screen.getByText('Save the menu to get its address.')).toBeTruthy()
    expect(actions.getMenuPublicURLAction).not.toHaveBeenCalled()
  })

  it('shows the saved menu address with copy and open', async () => {
    // arrange: id 7, the action resolves { ok: true, url: 'https://a.example.com/menu/corniche' }
    docInfo.id = 7
    docInfo.savedDocumentData = { updatedAt: '2026-10-19T00:00:00Z' }
    docInfo.hasPublishedDoc = true
    actions.getMenuPublicURLAction.mockResolvedValue({
      ok: true,
      url: 'https://a.example.com/menu/corniche',
    })

    // act: render
    render(<PublicURL />)

    // assert: the address shown, a Copy button, an Open link to the url in a new tab
    expect(await screen.findByText('https://a.example.com/menu/corniche')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Copy' })).toBeTruthy()
    const openLink = screen.getByRole('link', { name: 'Open' })
    expect(openLink.getAttribute('href')).toBe('https://a.example.com/menu/corniche')
    expect(openLink.getAttribute('target')).toBe('_blank')
    expect(openLink.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('notes that guests see it once the menu is published', async () => {
    // arrange: id 7, hasPublishedDoc false, the action resolves a url
    docInfo.id = 7
    docInfo.savedDocumentData = { updatedAt: '2026-10-19T00:00:00Z' }
    docInfo.hasPublishedDoc = false
    actions.getMenuPublicURLAction.mockResolvedValue({
      ok: true,
      url: 'https://a.example.com/menu/corniche',
    })

    // act: render
    render(<PublicURL />)

    // assert: "Guests can see this address once you publish the menu." shown
    expect(
      await screen.findByText('Guests can see this address once you publish the menu.'),
    ).toBeTruthy()
  })

  it('copies the address to the clipboard', async () => {
    // arrange: id 7, the action resolves a url, navigator.clipboard.writeText mocked
    docInfo.id = 7
    docInfo.savedDocumentData = { updatedAt: '2026-10-19T00:00:00Z' }
    docInfo.hasPublishedDoc = true
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    actions.getMenuPublicURLAction.mockResolvedValue({
      ok: true,
      url: 'https://a.example.com/menu/corniche',
    })

    // act: click Copy
    render(<PublicURL />)
    const copyButton = await screen.findByRole('button', { name: 'Copy' })
    fireEvent.click(copyButton)

    // assert: writeText called with the url, "Copied" shown
    expect(writeText).toHaveBeenCalledWith('https://a.example.com/menu/corniche')
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeTruthy()
  })

  it('fetches the address again after a save', async () => {
    // arrange: id 7, savedDocumentData.updatedAt 'a', then rerender with 'b' (a new save, e.g. a
    //   changed slug) and a new url from the action
    docInfo.id = 7
    docInfo.savedDocumentData = { updatedAt: 'a' }
    docInfo.hasPublishedDoc = true
    actions.getMenuPublicURLAction.mockResolvedValueOnce({
      ok: true,
      url: 'https://a.example.com/menu/first',
    })
    actions.getMenuPublicURLAction.mockResolvedValueOnce({
      ok: true,
      url: 'https://a.example.com/menu/second',
    })

    // act: render, rerender
    const { rerender } = render(<PublicURL />)
    expect(await screen.findByText('https://a.example.com/menu/first')).toBeTruthy()

    docInfo.savedDocumentData = { updatedAt: 'b' }
    rerender(<PublicURL />)

    // assert: the action called twice, the new url shown
    expect(await screen.findByText('https://a.example.com/menu/second')).toBeTruthy()
    expect(actions.getMenuPublicURLAction).toHaveBeenCalledTimes(2)
  })

  it("shows the refusal when the address can't be found", async () => {
    // arrange: id 7, the action resolves { ok: false, error: 'Give the menu a title and save it.' }
    docInfo.id = 7
    docInfo.savedDocumentData = { updatedAt: 'a' }
    actions.getMenuPublicURLAction.mockResolvedValue({
      ok: false,
      error: 'Give the menu a title and save it.',
    })

    // act: render
    render(<PublicURL />)

    // assert: that text shown, no Copy button
    expect(await screen.findByText('Give the menu a title and save it.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Copy' })).toBeNull()
  })
})
