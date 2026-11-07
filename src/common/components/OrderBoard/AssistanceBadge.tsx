import { Button } from '@payloadcms/ui'
import React from 'react'

const formatTimeSince = (at: string): string => {
  const diffMs = Math.max(0, Date.now() - new Date(at).getTime())
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes <= 0) return 'just now'
  return `${minutes} min ago`
}

/**
 * A guest request on a card (rem0018 phase 4 step 2a): "Staff called" / "Bill asked for" with the
 * time since (`at`), and a "Done" button that clears it (`onDone`). `role="status"`, class
 * `order-board__badge` (`--request`).
 */
export const AssistanceBadge: React.FC<{
  kind: 'staff' | 'bill'
  at: string
  onDone?: () => void
}> = ({ kind, at, onDone }) => {
  const label = kind === 'staff' ? 'Staff called' : 'Bill asked for'
  const timeSince = formatTimeSince(at)

  return (
    <span role="status" className="order-board__badge order-board__badge--request">
      <span className="order-board__badge-text">
        <span>{label}</span>
        <span> · </span>
        <span>{timeSince}</span>
      </span>
      {onDone && (
        <Button buttonStyle="secondary" size="small" margin={false} onClick={onDone}>
          Done
        </Button>
      )}
    </span>
  )
}
