// formatPrice(amount, currency, locale) (`src/common/utils/formatPrice.ts`, rem0017 phase 1 step 1):
// the price text guests and editors see. Pure, no db.
import { describe, expect, it } from 'vitest'

describe('formatPrice', () => {
  it('formats a price in the given currency', () => {
    // act: formatPrice(12.5, 'USD', 'en')
    // assert: '$12.50'
    expect.fail('not implemented')
  })

  it('shows two decimals for whole prices', () => {
    // act: formatPrice(10, 'QAR', 'en')
    // assert: the text ends in '10.00'
    expect.fail('not implemented')
  })

  it('formats prices for the arabic locale', () => {
    // act: formatPrice(12.5, 'QAR', 'ar')
    // assert: equals new Intl.NumberFormat('ar', { style: 'currency', currency: 'QAR' }).format(12.5)
    expect.fail('not implemented')
  })
})
