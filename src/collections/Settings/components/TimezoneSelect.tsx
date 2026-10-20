'use client'

import React, { useMemo } from 'react'
import { SelectInput, useField } from '@payloadcms/ui'
import type { TextFieldClientProps } from 'payload'

type Option = { label?: unknown; value: string }

const isOption = (val: unknown): val is Option =>
  typeof val === 'object' && val !== null && 'value' in val && typeof val.value === 'string'

/**
 * The Restaurant tab's timezone (rem0018) as a searchable dropdown of every IANA timezone the
 * browser knows, over a text field (see `validateTimezone` in `../fields/restaurant.ts`).
 */
export const TimezoneSelect: React.FC<TextFieldClientProps> = ({ field, path }) => {
  const fieldPath = path ?? field.name
  const { value, setValue, showError } = useField<string>({ path: fieldPath })

  const options = useMemo(() => {
    const raw =
      typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []
    const zones = raw.includes('UTC') ? raw : ['UTC', ...raw]
    return zones.map((tz) => ({
      label: tz,
      value: tz,
    }))
  }, [])

  return (
    <SelectInput
      path={fieldPath}
      name={field.name}
      label={field.label}
      description={field.admin?.description}
      isClearable={false}
      options={options}
      value={value ?? 'UTC'}
      showError={showError}
      onChange={(selected) => {
        if (isOption(selected)) {
          setValue(selected.value)
        } else if (Array.isArray(selected) && isOption(selected[0])) {
          setValue(selected[0].value)
        }
      }}
    />
  )
}
