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
