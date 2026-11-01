'use client'

import { FieldDescription, FieldError, FieldLabel, useField, useFormFields } from '@payloadcms/ui'
import { mergeFieldStyles } from '@payloadcms/ui/shared'
import type { NumberFieldClientComponent } from 'payload'
import React, { useEffect, useMemo, useState } from 'react'

import { DEFAULT_CURRENCY } from '@/collections/Settings/fields/currency'
import { currencyDigits, fromMinor, toMinor } from '@/common/utils/money'

/**
 * An amount the cashier types, as money ("18.50"), stored in minor units (1850) (rem0018 phase 2
 * step 1). The currency is the picked order's: read once from `/api/orders/<id>?depth=0` with
 * `select[currency]=true` when the order changes (no order yet: the business default,
 * `DEFAULT_CURRENCY`).
 * 1. `useField<number>({ path })` for the stored value, `useFormFields` for `order`
 * 2. show `fromMinor(value, currency)` in a text input (inputMode decimal), the currency code
 *    as a suffix
 * 3. on change: keep the typed text; on blur: `toMinor(text, currency)` → setValue (invalid →
 *    keep the text, Payload's `min` / the hook give the error)
 * 4. read-only when the field is (`readOnly` prop: a taken payment)
 */
export const MoneyInput: NumberFieldClientComponent = ({
  field,
  path,
  readOnly: readOnlyFromProps,
}) => {
  const { value, setValue, showError } = useField<number | null>({ path })
  const currencyFromForm = useFormFields(([fields]) => fields.currency?.value)
  const orderId = useFormFields(([fields]) => {
    const order = fields.order?.value
    if (typeof order === 'number' || typeof order === 'string') return order
    if (typeof order === 'object' && order !== null && 'id' in order) {
      const id = order.id
      if (typeof id === 'number' || typeof id === 'string') return id
    }
    return undefined
  })

  const [orderCurrency, setOrderCurrency] = useState<string | null>(null)

  useEffect(() => {
    if (!orderId) {
      setOrderCurrency(null)
      return
    }
    let active = true
    fetch(`/api/orders/${orderId}?depth=0&select[currency]=true`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: unknown) => {
        if (
          active &&
          typeof data === 'object' &&
          data !== null &&
          'currency' in data &&
          typeof data.currency === 'string'
        ) {
          setOrderCurrency(data.currency)
        }
      })
      // no order access or offline: the business default currency stays
      .catch(() => setOrderCurrency(null))
    return () => {
      active = false
    }
  }, [orderId])

  const code =
    (typeof currencyFromForm === 'string' && currencyFromForm ? currencyFromForm : null) ??
    orderCurrency ??
    DEFAULT_CURRENCY

  const [typed, setTyped] = useState<string>('')
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    if (!isFocused) {
      if (typeof value === 'number') {
        setTyped(fromMinor(value, code).toFixed(currencyDigits(code)))
      } else {
        setTyped('')
      }
    }
  }, [value, code, isFocused])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setTyped(val)
    if (val.trim() === '') {
      setValue(null)
    } else {
      const num = parseFloat(val)
      if (!Number.isNaN(num)) {
        setValue(toMinor(num, code))
      }
    }
  }

  const handleBlur = () => {
    setIsFocused(false)
    if (typed.trim() === '') {
      setValue(null)
      setTyped('')
    } else {
      const num = parseFloat(typed)
      if (!Number.isNaN(num)) {
        setValue(toMinor(num, code))
        setTyped(fromMinor(toMinor(num, code), code).toFixed(currencyDigits(code)))
      }
    }
  }

  const handleFocus = () => {
    setIsFocused(true)
  }

  const isReadOnly = Boolean(readOnlyFromProps || field?.admin?.readOnly)
  const style = useMemo(() => mergeFieldStyles(field), [field])

  return (
    <div
      className={[
        'field-type',
        'number',
        field?.admin?.className,
        showError && 'error',
        isReadOnly && 'read-only',
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
    >
      <FieldLabel htmlFor={`field-${path}`} label={field.label} required={field.required} />
      <div className="field-type__wrap">
        <FieldError path={path} showError={showError} />
        <input
          disabled={isReadOnly}
          id={`field-${path}`}
          inputMode="decimal"
          name={path}
          onBlur={handleBlur}
          onChange={handleChange}
          onFocus={handleFocus}
          placeholder={
            typeof field.admin?.placeholder === 'string' ? field.admin.placeholder : undefined
          }
          readOnly={isReadOnly}
          step="any"
          type="number"
          value={typed}
        />
        <FieldDescription description={field.admin?.description} path={path} />
      </div>
    </div>
  )
}
