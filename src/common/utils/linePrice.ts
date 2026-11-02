/**
 * The price of one order line in minor units (rem0018): (item price + chosen extras) × quantity.
 * Pure, so the order hook and the guest cart (phase 3) show the same number.
 */
export type LinePriceInput = {
  /** the item's price, minor units */
  unitPrice: number
  /** each chosen option's extra price, minor units (0 for a free choice) */
  extras: number[]
  quantity: number
}

export const linePrice = ({ unitPrice, extras, quantity }: LinePriceInput): number => {
  const extrasSum = extras.reduce((sum, extra) => sum + extra, 0)
  return (unitPrice + extrasSum) * quantity
}

export type LineBreakdownInput = {
  /** the item's price, minor units */
  basePrice: number
  /** the chosen add-ons in the order shown; `price` minor units, `null` or 0 = free */
  options: { label: string; price: number | null }[]
  quantity: number
}

export type LineBreakdown = {
  base: number
  /** free add-ons keep `price: null`, so the screens list them without a price */
  addOns: { label: string; price: number | null }[]
  /** base + add-ons, one item */
  unitTotal: number
  /** unitTotal × quantity, as `linePrice` */
  lineTotal: number
}

/**
 * What a guest reads on a line (rem0018 phase 3 step 2, user 2026-10-20): "Latte 15.00 · Large
 * + 2.00 · Oat + 1.00 · 18.00". Used by the item view, the cart, the tracker and the receipt, so
 * every screen adds up the same way as the order's snapshot (`linePrice`).
 */
export const lineBreakdown = ({
  basePrice,
  options,
  quantity,
}: LineBreakdownInput): LineBreakdown => {
  const addOns = options.map((opt) => ({
    label: opt.label,
    price: opt.price === 0 || opt.price === null ? null : opt.price,
  }))
  const extras = options.map((opt) => (opt.price !== null && opt.price > 0 ? opt.price : 0))
  const extrasSum = extras.reduce((sum, extra) => sum + extra, 0)
  const unitTotal = basePrice + extrasSum
  const lineTotal = linePrice({ unitPrice: basePrice, extras, quantity })
  return {
    base: basePrice,
    addOns,
    unitTotal,
    lineTotal,
  }
}
