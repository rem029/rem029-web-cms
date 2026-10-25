/**
 * Money in minor units (rem0018): order totals and payments are integers in the currency's
 * smallest unit (QAR 12.50 → 1250, KWD 1.250 → 1250), so sums never drift. Catalog prices stay
 * decimal numbers (`menu-items.price`); orders convert them once, when they are snapshotted.
 * Pure, no payload import: safe in client components.
 */

/** The currency's decimal digits from `Intl` (QAR 2, KWD 3, JPY 0); an unknown code → 2. */
export const currencyDigits = (currency: string): number => {
  try {
    const digits = new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
    }).resolvedOptions().maximumFractionDigits
    return typeof digits === 'number' ? digits : 2
  } catch {
    return 2
  }
}

/** A decimal amount in minor units, rounded to the nearest unit (12.5 QAR → 1250). */
export const toMinor = (amount: number, currency: string): number =>
  Math.round(amount * 10 ** currencyDigits(currency))

/** Minor units back to a decimal amount for display (1250 QAR → 12.5). */
export const fromMinor = (minor: number, currency: string): number =>
  minor / 10 ** currencyDigits(currency)

/** Minor units as money text in the currency's own digits (150 USD → "$1.50", 1500 KWD → "KWD 1.500"). */
export const formatMinor = (minor: number, currency: string, locale: string): string => {
  const amount = fromMinor(minor, currency)
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)
  } catch {
    // an unknown currency code: the plain amount and the code, never a crash in a list cell
    return `${amount.toFixed(currencyDigits(currency))} ${currency}`
  }
}
