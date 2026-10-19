/**
 * The price text guests and editors see (menu cards, item view, the menu builder): the tenant's
 * currency (`settings.currency`) in the visitor's locale. Pure, no payload import: safe in
 * client components.
 */
export const formatPrice = (amount: number, currency: string, locale: string): string =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
