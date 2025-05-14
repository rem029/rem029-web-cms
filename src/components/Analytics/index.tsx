'use client'
import { addAnalytics } from '@/utilities/analytics'

import { usePathname } from 'next/navigation'
import React, { useEffect } from 'react'

export interface InterfaceAnalyticsComponentProps {
  draftMode: boolean
}
export const AnalyticsComponent: React.FC<InterfaceAnalyticsComponentProps> = ({ draftMode }) => {
  const pathName = usePathname()

  useEffect(() => {
    const handleAnalytics = async () => {
      if (!draftMode) {
        addAnalytics({
          eventType: 'page_view',
          pagePath: pathName,
        })
      }
    }

    handleAnalytics()
  }, [pathName, draftMode])

  return null
}
