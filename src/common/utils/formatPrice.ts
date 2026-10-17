/**
 * The price text guests and editors see (menu cards, item view, the menu builder): the tenant's
 * currency (`settings.currency`) in the visitor's locale. Pure, no payload import: safe in
 * client components.
 */
export const formatPrice = (_amount: number, _currency: string, _locale: string): string => {
  // 1. new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 2 })
  // 2. return its format(amount)
  throw new Error('not implemented')
}
