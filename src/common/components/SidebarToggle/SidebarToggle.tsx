'use client'

import React from 'react'

/** localStorage key for the browser's choice: 'open' | 'closed' (anything else = closed) */
export const SIDEBAR_STORAGE_KEY = 'admin-doc-sidebar'

/** set on <html> while the sidebar is open; the CSS in `admin-theme/_shell.scss` reads it */
export const SIDEBAR_OPEN_ATTRIBUTE = 'data-doc-sidebar'

/**
 * Document bar (`beforeDocumentControls`, added by the `addSidebarToggle` plugin): one icon button
 * that opens the edit view's sidebar (`.document-fields__sidebar-wrap`) as a floating panel over the
 * form, and closes it again (rem0005 phase 3 step 4). Closed by default; the last choice is kept per
 * browser. While open the form behind dims and takes no clicks or scrolling (CSS). Escape closes it.
 */
export function SidebarToggle() {
  // SKELETON (phase 3 step 4):
  // 1. state `open`, initially false; on mount read localStorage[SIDEBAR_STORAGE_KEY] in a try/catch:
  //    'open' → true, anything else or a thrown error → false
  // 2. effect on `open`: set <html SIDEBAR_OPEN_ATTRIBUTE="open"> when open, remove it when closed;
  //    cleanup removes it (leaving the edit view never leaves the page locked)
  // 3. toggle(): flip `open`, write 'open' / 'closed' to localStorage in a try/catch (a failed write
  //    keeps the in-page state)
  // 4. effect while open: a keydown listener on document, Escape → close (and store 'closed')
  // 5. render: <button type="button" className="sidebar-toggle" aria-pressed={open}
  //    aria-expanded={open} aria-label={open ? 'Hide sidebar' : 'Show sidebar'}> with a panel icon
  //    (svg, aria-hidden)
  return null
}
