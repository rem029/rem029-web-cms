// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { HiddenBanner } from '@/common/components/HiddenBanner'

type FormFields = {
  isHidden?: { value?: boolean }
  _status?: { value?: string }
}

const formState = vi.hoisted((): { fields: FormFields } => ({
  fields: {},
}))

vi.mock('@payloadcms/ui', () => ({
  useFormFields: <T,>(selector: (context: [FormFields]) => T): T => selector([formState.fields]),
}))

describe('HiddenBanner', () => {
  afterEach(() => {
    cleanup()
    formState.fields = {}
  })

  it('shows nothing on a doc that is not hidden', () => {
    // arrange
    formState.fields = { isHidden: { value: false } }

    // act
    render(<HiddenBanner />)

    // assert
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('shows the hidden notice on a hidden doc', () => {
    // arrange
    formState.fields = { isHidden: { value: true }, _status: { value: 'draft' } }

    // act
    render(<HiddenBanner />)

    // assert
    const banner = screen.queryByRole('status')
    expect(banner).not.toBeNull()
    expect(banner?.textContent).toContain('Hidden from other members')
  })

  it('says a published hidden doc stays on the public site', () => {
    // arrange
    formState.fields = { isHidden: { value: true }, _status: { value: 'published' } }

    // act
    render(<HiddenBanner />)

    // assert
    const banner = screen.queryByRole('status')
    expect(banner).not.toBeNull()
    expect(banner?.textContent).toContain('still visible on the public site')
  })

  it('leaves the public site line out on a hidden draft', () => {
    // arrange
    formState.fields = { isHidden: { value: true }, _status: { value: 'draft' } }

    // act
    render(<HiddenBanner />)

    // assert
    const banner = screen.queryByRole('status')
    expect(banner).not.toBeNull()
    expect(banner?.textContent).not.toContain('public site')
  })
})
