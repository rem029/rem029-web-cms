// @vitest-environment jsdom
// On Automatic the admin starts in the device's theme before the first paint; a saved choice wins.
import { afterEach, describe, expect, it, vi } from 'vitest'

import { applyDeviceTheme } from '@/common/components/AdminTheme/initialTheme'

function createMatchMedia(matches: boolean): (query: string) => MediaQueryList {
  return (query: string): MediaQueryList => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
  })
}

describe('applyDeviceTheme', () => {
  afterEach(() => {
    // clear the cookie and reset <html data-theme="light"> (what Payload's server renders)
    document.cookie = 'payload-theme=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
    document.documentElement.setAttribute('data-theme', 'light')
  })

  it('starts dark on a dark device without a cookie', () => {
    // arrange: no payload-theme cookie, data-theme 'light', matchMedia stub matching dark
    document.documentElement.setAttribute('data-theme', 'light')
    const matchMedia = createMatchMedia(true)

    // act: applyDeviceTheme(document, stub)
    applyDeviceTheme(document, matchMedia)

    // assert: data-theme is 'dark'
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('keeps a light cookie on a dark device', () => {
    // arrange: cookie payload-theme=light, data-theme 'light', matchMedia stub matching dark
    document.cookie = 'payload-theme=light; path=/'
    document.documentElement.setAttribute('data-theme', 'light')
    const matchMedia = createMatchMedia(true)

    // act: applyDeviceTheme(document, stub)
    applyDeviceTheme(document, matchMedia)

    // assert: data-theme is still 'light'
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('keeps a dark cookie on a light device', () => {
    // arrange: cookie payload-theme=dark, data-theme 'dark', matchMedia stub not matching dark
    document.cookie = 'payload-theme=dark; path=/'
    document.documentElement.setAttribute('data-theme', 'dark')
    const matchMedia = createMatchMedia(false)

    // act: applyDeviceTheme(document, stub)
    applyDeviceTheme(document, matchMedia)

    // assert: data-theme is still 'dark'
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('starts light on a light device without a cookie', () => {
    // arrange: no cookie, data-theme 'light', matchMedia stub not matching dark
    document.documentElement.setAttribute('data-theme', 'light')
    const matchMedia = createMatchMedia(false)

    // act: applyDeviceTheme(document, stub)
    applyDeviceTheme(document, matchMedia)

    // assert: data-theme is still 'light'
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })
})
