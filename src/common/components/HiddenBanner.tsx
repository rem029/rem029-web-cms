'use client'

import React from 'react'
import { useFormFields } from '@payloadcms/ui'

export const HiddenBanner: React.FC = () => {
  const isHidden = useFormFields(([fields]) => Boolean(fields?.isHidden?.value))
  const status = useFormFields(([fields]) =>
    typeof fields?._status?.value === 'string' ? fields._status.value : undefined,
  )

  if (!isHidden) {
    return null
  }

  const isPublished = status === 'published'

  return (
    <div
      role="status"
      style={{
        backgroundColor: 'var(--theme-elevation-100)',
        color: 'var(--theme-elevation-800)',
        borderInlineStart: '4px solid var(--theme-warning-500)',
        paddingInline: 'calc(var(--base) * 0.75)',
        paddingBlock: 'calc(var(--base) * 0.5)',
        marginBlockEnd: 'calc(var(--base) * 0.75)',
        borderRadius: 'var(--style-radius-s)',
        fontSize: '0.875rem',
        lineHeight: 1.5,
      }}
    >
      Hidden from other members. Only its creator, the people in Visible to, tenant admins and super
      users can see it.
      {isPublished ? " It's still visible on the public site." : ''}
    </div>
  )
}
