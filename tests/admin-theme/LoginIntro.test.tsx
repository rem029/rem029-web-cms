// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { LoginIntro } from '@/common/components/LoginIntro/LoginIntro'

describe('LoginIntro', () => {
  afterEach(() => {
    cleanup()
  })

  it('shows the sign-in heading', () => {
    // arrange
    render(<LoginIntro />)

    // act
    const heading = screen.queryByRole('heading', { name: 'Sign in' })

    // assert
    expect(heading).not.toBeNull()
    expect(screen.queryByText('Manage your website and your business in one place.')).not.toBeNull()
  })

  it('no longer shows the template welcome text', () => {
    // arrange
    render(<LoginIntro />)

    // act
    const welcome = screen.queryByText(/Welcome to your dashboard/)

    // assert
    expect(welcome).toBeNull()
  })
})
