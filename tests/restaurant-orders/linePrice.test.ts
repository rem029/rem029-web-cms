// What a guest reads on an order line (rem0018 phase 3 step 2a, src/common/utils/linePrice.ts:
// lineBreakdown): base price, each chosen add-on with its price, then the total. Pure, minor units.
import { describe, expect, it } from 'vitest'

import { lineBreakdown } from '@/common/utils/linePrice'

describe('lineBreakdown', () => {
  it('adds chosen extras to the base price', () => {
    // arrange: base 1500, Large + 200, Oat + 100, quantity 1
    const input = {
      basePrice: 1500,
      options: [
        { label: 'Large', price: 200 },
        { label: 'Oat', price: 100 },
      ],
      quantity: 1,
    }

    // act: lineBreakdown(…)
    const result = lineBreakdown(input)

    // assert: base 1500, addOns [Large 200, Oat 100], unitTotal 1800, lineTotal 1800
    expect(result).toEqual({
      base: 1500,
      addOns: [
        { label: 'Large', price: 200 },
        { label: 'Oat', price: 100 },
      ],
      unitTotal: 1800,
      lineTotal: 1800,
    })
  })

  it('multiplies by the quantity', () => {
    // arrange: base 1200, Large + 200, quantity 3
    const input = {
      basePrice: 1200,
      options: [{ label: 'Large', price: 200 }],
      quantity: 3,
    }

    // act: lineBreakdown(…)
    const result = lineBreakdown(input)

    // assert: unitTotal 1400, lineTotal 4200
    expect(result.unitTotal).toBe(1400)
    expect(result.lineTotal).toBe(4200)
  })

  it('lists free add-ons without a price', () => {
    // arrange: base 1200, Small price 0 and No onions price null, quantity 1
    const input = {
      basePrice: 1200,
      options: [
        { label: 'Small', price: 0 },
        { label: 'No onions', price: null },
      ],
      quantity: 1,
    }

    // act: lineBreakdown(…)
    const result = lineBreakdown(input)

    // assert: addOns [{ Small, price null }, { No onions, price null }], unitTotal 1200
    expect(result.addOns).toEqual([
      { label: 'Small', price: null },
      { label: 'No onions', price: null },
    ])
    expect(result.unitTotal).toBe(1200)
  })
})
