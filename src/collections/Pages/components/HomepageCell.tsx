'use client'

import type { DefaultCellComponentProps } from 'payload'
import React from 'react'

// a badge on the one page visitors see at `/`, nothing on the others (a "false" on every row is noise)
export const HomepageCell: React.FC<DefaultCellComponentProps> = ({ cellData }) => {
  if (cellData !== true) return null

  return (
    <span
      style={{
        backgroundColor: 'var(--theme-success-100)',
        color: 'var(--theme-success-800)',
        borderRadius: 'var(--style-radius-s)',
        padding: '2px calc(var(--base) * 0.4)',
        fontSize: '0.8125rem',
        whiteSpace: 'nowrap',
        display: 'inline-block',
        width: 'auto',
      }}
    >
      Homepage
    </span>
  )
}
