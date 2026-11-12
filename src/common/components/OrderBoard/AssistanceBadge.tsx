'use client'

import { Button } from '@payloadcms/ui'
import React from 'react'

import { formatSince } from './timeLabels'
import { useNow } from './useNow'

/**
 * A guest request on a card (rem0018 phase 4; sdq `AssistanceBadge`): "Staff called" / "Bill asked
 * for" with the time since (`at`), and a "Done" button that clears it (`onDone`). `role="status"`,
 * class `order-board__badge` (`--request`).
 */
export const AssistanceBadge: React.FC<{
  kind: 'staff' | 'bill'
  at: string
  onDone?: () => void
}> = ({ kind, at, onDone }) => {
  const label = kind === 'staff' ? 'Staff called' : 'Bill asked for'
  const timeSince = formatSince(at, useNow())

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
