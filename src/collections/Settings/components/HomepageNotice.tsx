'use client'

import React from 'react'
import { useFormFields } from '@payloadcms/ui'

export const HomepageNotice: React.FC = () => {
  const homepage = useFormFields(([fields]) => fields?.homepage?.value)

  if (homepage) {
    return null
  }

  return (
    <div
      role="status"
      style={{
        backgroundColor: 'var(--theme-warning-100)',
        color: 'var(--theme-warning-800)',
        padding: 'var(--base)',
        borderRadius: 'var(--style-radius-s)',
        marginBlockEnd: 'calc(var(--base) * 0.75)',
        fontSize: '0.875rem',
        lineHeight: 1.5,
      }}
    >
      {
        'No homepage selected. Visitors see your page with the slug "home", or an empty page if you don\'t have one. Pick a page below.'
      }
    </div>
  )
}
