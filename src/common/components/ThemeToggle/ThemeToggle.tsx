'use client'

import { useTheme } from '@payloadcms/ui'
import React from 'react'

function SunIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  )
}

/**
 * Admin `actions` slot (app header, next to the account chip): one button that flips the admin
 * between dark and light, so nobody has to open the account page for it. The icon shows where it
 * goes (sun while dark, moon while light). The admin opens on Automatic (no cookie: the device's
 * colour scheme); Payload's `setTheme` stores a click in the `payload-theme` cookie, and Automatic
 * comes back from the account page. Styled by `.theme-toggle` in `admin-theme/_shell.scss`.
 * While it switches, `theme-switching` on `<html>` stops every transition, so the whole admin
 * changes in one frame instead of fading at each element's own speed.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const next = theme === 'dark' ? 'light' : 'dark'
  const label = `Switch to ${next} mode`

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={label}
      title={label}
      onClick={() => {
        // pause transitions for two frames so all colours switch at once
        const { classList } = document.documentElement
        classList.add('theme-switching')
        setTheme(next)
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            classList.remove('theme-switching')
          })
        })
      }}
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}
