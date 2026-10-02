'use client'

import { toProperCase } from '@/utilities/format'
import { useRowLabel } from '@payloadcms/ui'

export const AccessRowLabel = () => {
  const { data, rowNumber } = useRowLabel<{ slug?: string }>()

  const fallback =
    typeof rowNumber === 'number' ? `Row ${String(rowNumber).padStart(2, '0')}` : 'Row 01'
  const customLabel = data?.slug ? toProperCase(data.slug) : fallback

  return <p>{customLabel}</p>
}
