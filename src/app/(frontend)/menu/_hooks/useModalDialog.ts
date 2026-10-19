'use client'

import { useCallback, useEffect, useRef } from 'react'

/**
 * A native `<dialog>` opened as a modal on mount (ItemView, SearchOverlay): the browser keeps
 * focus inside, Escape closes it, and closing gives focus back to what had it before (the item
 * card, the search button). `close` is for the dialog's own close button: it closes through the
 * browser, so focus is returned the same way, and `onClose` runs from the `close` event.
 */
export const useModalDialog = (onClose: () => void) => {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    // jsdom has no showModal
    if (typeof dialog.showModal === 'function') dialog.showModal()
    else dialog.setAttribute('open', '')
    dialog.addEventListener('close', onClose)
    return () => dialog.removeEventListener('close', onClose)
  }, [onClose])

  const close = useCallback(() => {
    const dialog = ref.current
    if (dialog && typeof dialog.close === 'function' && dialog.open) dialog.close()
    else onClose()
  }, [onClose])

  return { ref, close }
}
