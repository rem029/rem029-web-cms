'use client'

import type { DefaultCellComponentProps } from 'payload'
import React from 'react'

// "In stock" and "Show on menus" in the items list: a short badge instead of true / false
export const YesNoCell: React.FC<DefaultCellComponentProps> = ({ cellData }) => {
  const yes = cellData === true
  return (
    <span
      style={{
        backgroundColor: yes ? 'var(--theme-success-100)' : 'var(--theme-elevation-100)',
        color: yes ? 'var(--theme-success-800)' : 'var(--theme-elevation-800)',
        borderRadius: 'var(--style-radius-s)',
        padding: '2px calc(var(--base) * 0.4)',
        fontSize: '0.8125rem',
        whiteSpace: 'nowrap',
        display: 'inline-block',
        width: 'auto',
      }}
    >
      {yes ? 'Yes' : 'No'}
    </span>
  )
}
