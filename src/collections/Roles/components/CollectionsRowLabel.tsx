'use client'

import { useRowLabel } from '@payloadcms/ui'

export const CollectionsRowLabel = () => {
  const { data, rowNumber } = useRowLabel<{ collection?: string }>()

  const customLabel = `${data.collection || 'Collection'} ${String(rowNumber).padStart(2, '0')} `

  return <p>{customLabel}</p>
}
