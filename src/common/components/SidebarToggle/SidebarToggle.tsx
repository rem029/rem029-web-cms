'use client'

import React, { useEffect, useState } from 'react'

/** localStorage key for the browser's choice: 'open' | 'closed' (anything else = closed) */
export const SIDEBAR_STORAGE_KEY = 'admin-doc-sidebar'

/** set on <html> while the sidebar is open; the CSS in `admin-theme/_shell.scss` reads it */
export const SIDEBAR_OPEN_ATTRIBUTE = 'data-doc-sidebar'

// the panel's top edge, set on <html> while open
const SIDEBAR_TOP_PROPERTY = '--doc-sidebar-top'

/**
 * Document bar (`beforeDocumentControls`, added by the `addSidebarToggle` plugin): one icon button
 * that opens the edit view's sidebar (`.document-fields__sidebar-wrap`) as a floating panel over the
 * form, and closes it again (rem0005 phase 3 step 4). Closed by default; the last choice is kept per
 * browser. While open the form behind dims and takes no clicks or scrolling (CSS). Escape closes it.
 */
export function SidebarToggle() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      setOpen(localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'open')
    } catch {
      setOpen(false)
    }
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (open) {
      // the topbar scrolls away and the document bar sticks: the panel starts where the bar ends
      const bar = document.querySelector('.doc-controls')
      if (bar)
        root.style.setProperty(SIDEBAR_TOP_PROPERTY, `${bar.getBoundingClientRect().bottom}px`)
      root.setAttribute(SIDEBAR_OPEN_ATTRIBUTE, 'open')
    } else {
      root.removeAttribute(SIDEBAR_OPEN_ATTRIBUTE)
    }
    return () => {
      root.removeAttribute(SIDEBAR_OPEN_ATTRIBUTE)
      root.style.removeProperty(SIDEBAR_TOP_PROPERTY)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      // a select menu or date picker in the panel handles its own Escape first
      if (event.key !== 'Escape' || event.defaultPrevented) return
      setOpen(false)
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, 'closed')
      } catch {
        // keep in-page state when storage is unavailable
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  const toggle = () => {
    const next = !open
    setOpen(next)
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? 'open' : 'closed')
    } catch {
      // keep in-page state when storage is unavailable
    }
  }

  const label = open ? 'Hide sidebar' : 'Show sidebar'

  return (
    <button
      type="button"
      className="sidebar-toggle"
      aria-pressed={open}
      aria-expanded={open}
      aria-label={label}
      title={label}
      onClick={toggle}
    >
      <svg
        aria-hidden="true"
        focusable="false"
        width={20}
        height={20}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="4" width="18" height="16" rx="1" />
        <line x1="15" y1="4" x2="15" y2="20" />
      </svg>
    </button>
  )
}
