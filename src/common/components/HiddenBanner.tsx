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
    <div className="admin-notice" role="status">
      Hidden from other members. Only its creator, the people in Visible to, tenant admins and super
      users can see it.
      {isPublished ? " It's still visible on the public site." : ''}
    </div>
  )
}
