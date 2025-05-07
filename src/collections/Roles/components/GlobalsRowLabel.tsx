'use client'

import { toProperCase } from '@/utilities/format'
import { useRowLabel } from '@payloadcms/ui'

export const GlobalsRowLabel = () => {
  const { data, rowNumber } = useRowLabel<{ global?: string }>()

  const customLabel = data.global
    ? toProperCase(data.global)
    : `${data.global || 'Global'} ${String(rowNumber).padStart(2, '0')} `

  return <p>{customLabel}</p>
}
