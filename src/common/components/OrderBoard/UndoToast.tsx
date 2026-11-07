'use client'

import { Button } from '@payloadcms/ui'
import React, { useEffect } from 'react'

/** How long the undo stays (sdq: a few seconds). */
export const UNDO_MS = 6_000

/**
 * The undo after a move (rem0018 phase 4 step 2a, sdq `undo-toast`): "Order 23 → Preparing ·
 * Undo", `role="status"`, gone after `UNDO_MS` (`onExpire`) or once Undo is pressed (`onUndo`).
 * One toast at a time: a new move replaces it.
 */
export const UndoToast: React.FC<{
  message: string
  onUndo: () => void
  onExpire: () => void
}> = ({ message, onUndo, onExpire }) => {
  useEffect(() => {
    const timer = window.setTimeout(onExpire, UNDO_MS)
    return () => window.clearTimeout(timer)
  }, [onExpire, message])

  return (
    <div role="status" className="order-board__undo-toast">
      <span>{message}</span>
      <Button buttonStyle="secondary" size="small" onClick={onUndo}>
        Undo
      </Button>
    </div>
  )
}
