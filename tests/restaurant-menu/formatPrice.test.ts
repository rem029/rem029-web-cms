// formatPrice(amount, currency, locale) (`src/common/utils/formatPrice.ts`, rem0017 phase 1 step 1):
// the price text guests and editors see. Pure, no db.
import { describe, expect, it } from 'vitest'

import { formatPrice } from '@/common/utils/formatPrice'

describe('formatPrice', () => {
  it('formats a price in the given currency', () => {
    // act
    const text = formatPrice(12.5, 'USD', 'en')

    // assert
    expect(text).toBe('$12.50')
  })

  it('shows two decimals for whole prices', () => {
    // act
    const text = formatPrice(10, 'QAR', 'en')

    // assert
    expect(text).toMatch(/10\.00$/)
  })

  it('formats prices for the arabic locale', () => {
    // act
    const text = formatPrice(12.5, 'QAR', 'ar')

    // assert
    expect(text).toBe(
      new Intl.NumberFormat('ar', {
        style: 'currency',
        currency: 'QAR',
        minimumFractionDigits: 2,
      }).format(12.5),
    )
  })
})
