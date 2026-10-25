// @vitest-environment jsdom
// The read-only money fields on an order's edit view (rem0018 phase 1 step 3a,
// `src/collections/Orders/components/MoneyField.tsx`): minor units shown in the order's currency.
// Outside edges mocked: `@payloadcms/ui` (useField, useFormFields, useTranslation, TextInput, mergeFieldStyles).
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { MoneyField } from '@/collections/Orders/components/MoneyField'

const form = vi.hoisted(() => ({
  value: undefined as number | undefined,
  currency: undefined as string | undefined,
}))

vi.mock('@payloadcms/ui/shared', () => ({
  mergeFieldStyles: () => ({}),
}))

vi.mock('@payloadcms/ui', () => ({
  useField: () => ({ value: form.value }),
  useFormFields: (selector: (state: [Record<string, { value: unknown }>]) => unknown) =>
    selector([{ currency: { value: form.currency } }]),
  useTranslation: () => ({ i18n: { language: 'en' } }),
  TextInput: ({ label, value }: { label?: string; value?: string }) => (
    <label>
      {label}
      <input readOnly value={value ?? ''} />
    </label>
  ),
}))

const props = {
  path: 'total',
  field: { name: 'total', type: 'number' as const, label: 'Total' },
}

describe('MoneyField', () => {
  beforeEach(() => {
    form.value = undefined
    form.currency = undefined
  })

  afterEach(() => {
    cleanup()
  })

  it('shows the amount in the order currency', () => {
    // arrange: value 150, currency KWD
    form.value = 150
    form.currency = 'KWD'

    // act: render the field
    render(<MoneyField {...props} />)

    // assert: the input reads "KWD 0.150"
    expect(screen.getByLabelText('Total')).toHaveProperty('value', 'KWD 0.150')
  })

  it('stays empty before the order is saved', () => {
    // arrange: no value yet (create view), currency USD
    form.currency = 'USD'

    // act: render the field
    render(<MoneyField {...props} />)

    // assert: the input is empty
    expect(screen.getByLabelText('Total')).toHaveProperty('value', '')
  })
})
