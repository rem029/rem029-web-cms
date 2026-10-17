// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

describe('LoginIntro', () => {
  it('shows the sign-in heading', () => {
    // arrange: render <LoginIntro />
    // act: find the heading by role
    // assert: its text is "Sign in", and the line below it is shown
    expect.fail('not implemented')
  })

  it('no longer shows the template welcome text', () => {
    // arrange: render <LoginIntro />
    // act: look for "Welcome to your dashboard"
    // assert: not in the document
    expect.fail('not implemented')
  })
})
