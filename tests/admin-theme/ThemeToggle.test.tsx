// @vitest-environment jsdom
// The header button flips the admin between dark and light in one click.
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ThemeToggle } from '@/common/components/ThemeToggle/ThemeToggle'

type Theme = 'dark' | 'light'

const themeState = vi.hoisted((): { theme: Theme; setTheme: ReturnType<typeof vi.fn> } => ({
  theme: 'dark',
  setTheme: vi.fn(),
}))

vi.mock('@payloadcms/ui', () => ({
  useTheme: () => ({ theme: themeState.theme, setTheme: themeState.setTheme, autoMode: false }),
}))

let rafSpy: ReturnType<typeof vi.spyOn> | undefined

describe('ThemeToggle', () => {
  afterEach(() => {
    cleanup()
    themeState.theme = 'dark'
    themeState.setTheme.mockReset()
    rafSpy?.mockRestore()
    rafSpy = undefined
    document.documentElement.classList.remove('theme-switching')
  })

  it('offers light mode while dark', () => {
    // arrange: useTheme mocked with theme 'dark'
    themeState.theme = 'dark'

    // act: render <ThemeToggle />
    render(<ThemeToggle />)

    // assert: a button named "Switch to light mode"
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeDefined()
  })

  it('offers dark mode while light', () => {
    // arrange: useTheme mocked with theme 'light'
    themeState.theme = 'light'

    // act: render <ThemeToggle />
    render(<ThemeToggle />)

    // assert: a button named "Switch to dark mode"
    expect(screen.getByRole('button', { name: 'Switch to dark mode' })).toBeDefined()
  })

  it('switches to light on click while dark', () => {
    // arrange: theme 'dark', setTheme a vi.fn()
    themeState.theme = 'dark'
    render(<ThemeToggle />)

    // act: click the button
    fireEvent.click(screen.getByRole('button', { name: 'Switch to light mode' }))

    // assert: setTheme called once with 'light'
    expect(themeState.setTheme).toHaveBeenCalledTimes(1)
    expect(themeState.setTheme).toHaveBeenCalledWith('light')
  })

  it('switches to dark on click while light', () => {
    // arrange: theme 'light', setTheme a vi.fn()
    themeState.theme = 'light'
    render(<ThemeToggle />)

    // act: click the button
    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }))

    // assert: setTheme called once with 'dark'
    expect(themeState.setTheme).toHaveBeenCalledTimes(1)
    expect(themeState.setTheme).toHaveBeenCalledWith('dark')
  })

  it('pauses transitions while the theme switches', () => {
    // arrange: theme 'dark', render <ThemeToggle />, rAF stubbed (vi.spyOn window.requestAnimationFrame,
    //   callbacks held, not run)
    const callbacks: FrameRequestCallback[] = []
    let nextId = 1
    rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      callbacks.push(cb)
      return nextId++
    })
    themeState.theme = 'dark'
    render(<ThemeToggle />)

    // act: click the button
    fireEvent.click(screen.getByRole('button', { name: 'Switch to light mode' }))

    // assert: <html> has the class 'theme-switching'
    expect(document.documentElement.classList.contains('theme-switching')).toBe(true)
  })

  it('resumes transitions after the switch', () => {
    // arrange: as above, then click the button
    const callbacks: FrameRequestCallback[] = []
    let nextId = 1
    rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      callbacks.push(cb)
      return nextId++
    })
    themeState.theme = 'dark'
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button', { name: 'Switch to light mode' }))
    expect(document.documentElement.classList.contains('theme-switching')).toBe(true)

    // act: run the held rAF callbacks (two frames: the first schedules the second)
    callbacks.shift()?.(0)
    callbacks.shift()?.(0)

    // assert: <html> no longer has 'theme-switching'
    expect(document.documentElement.classList.contains('theme-switching')).toBe(false)
  })
})
