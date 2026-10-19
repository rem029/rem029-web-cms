// @vitest-environment jsdom
// The menu builder's item form (`src/collections/Menus/components/ItemFormModal.tsx`): a call
// that never answers (network down, a request over the server's size limit) shows an error and
// leaves the form usable, and a photo over 10 MB is refused before it is sent. Outside edge
// mocked: the server actions module (`components/actions.ts`).
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ItemFormModal } from '@/collections/Menus/components/ItemFormModal'

const actions = vi.hoisted(() => ({
  getItemFormAction: vi.fn(),
  saveItemAction: vi.fn(),
  listLookupsAction: vi.fn(),
  uploadItemImageAction: vi.fn(),
}))

vi.mock('@/collections/Menus/components/actions', () => actions)

const OFFLINE = "Couldn't reach the server. Check your connection and try again."

const MB = 1024 * 1024

/** A photo of `size` bytes (jsdom files report the size they're given here). */
const photo = (size: number): File => {
  const file = new File(['x'], 'soup.jpg', { type: 'image/jpeg' })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

const renderForm = (itemId: number | 'new' = 'new') =>
  render(
    <ItemFormModal
      tenantId={1}
      locale="en"
      itemId={itemId}
      categories={[]}
      defaultCategory={null}
      onClose={vi.fn()}
      onSaved={vi.fn()}
    />,
  )

describe('ItemFormModal', () => {
  beforeEach(() => {
    actions.listLookupsAction.mockResolvedValue({ ok: true, allergens: [], tags: [] })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('refuses a photo over 10 MB before uploading it', async () => {
    // arrange: a new item
    renderForm()

    // act: pick an 11 MB photo
    fireEvent.change(screen.getByLabelText('Upload photo'), {
      target: { files: [photo(11 * MB)] },
    })

    // assert: the size error shown, nothing sent
    expect(await screen.findByText('The image is too big. Pick one under 10 MB.')).toBeTruthy()
    expect(actions.uploadItemImageAction).not.toHaveBeenCalled()
  })

  it('shows an error when the photo upload fails', async () => {
    // arrange: the upload action rejects (the request never got an answer)
    actions.uploadItemImageAction.mockRejectedValue(new Error('Body exceeded 1 MB limit'))
    renderForm()
    const upload = screen.getByLabelText('Upload photo')

    // act: pick a 3 MB photo
    fireEvent.change(upload, { target: { files: [photo(3 * MB)] } })

    // assert: the connection error shown, the form usable again
    expect(await screen.findByText(OFFLINE)).toBeTruthy()
    expect(upload).toHaveProperty('disabled', false)
    expect(screen.getByRole('button', { name: 'Save item' })).toHaveProperty('disabled', false)
  })

  it('shows an error when saving fails', async () => {
    // arrange: the save action rejects
    actions.saveItemAction.mockRejectedValue(new Error('Failed to fetch'))
    renderForm()

    // act: click Save item
    fireEvent.click(screen.getByRole('button', { name: 'Save item' }))

    // assert: the connection error shown, Save item clickable again
    expect(await screen.findByText(OFFLINE)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Save item' })).toHaveProperty('disabled', false)
  })

  it('shows an error when the item fails to load', async () => {
    // arrange: the item form action rejects
    actions.getItemFormAction.mockRejectedValue(new Error('Failed to fetch'))

    // act: open item 5
    renderForm(5)

    // assert: the connection error shown instead of "Loading…"
    expect(await screen.findByText(OFFLINE)).toBeTruthy()
    expect(screen.queryByText('Loading…')).toBeNull()
  })
})
