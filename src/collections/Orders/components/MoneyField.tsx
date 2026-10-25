'use client'

import { TextInput, useField, useFormFields, useTranslation } from '@payloadcms/ui'
import { mergeFieldStyles } from '@payloadcms/ui/shared'
import type { NumberFieldClientComponent } from 'payload'
import React, { useMemo } from 'react'

import { DEFAULT_CURRENCY } from '@/collections/Settings/fields/currency'
import { formatMinor } from '@/common/utils/money'

/**
 * A read-only order amount (prices, line totals, totals, paid, balance) in the order's currency:
 * stored in minor units (150), shown as money ("$1.50"). Every one of these fields is computed
 * on the server, so the field never edits.
 */
export const MoneyField: NumberFieldClientComponent = ({ field, path }) => {
  const { value } = useField<number>({ path })
  const currency = useFormFields(([fields]) => fields.currency?.value)
  const { i18n } = useTranslation()
  // the field's `admin.width`, as Payload's own fields apply it
  const style = useMemo(() => mergeFieldStyles(field), [field])

  const code = typeof currency === 'string' && currency ? currency : DEFAULT_CURRENCY
  const text = typeof value === 'number' ? formatMinor(value, code, i18n.language) : ''

  return <TextInput label={field.label} path={path} readOnly style={style} value={text} />
}
