/**
 * Time labels on the boards (pure, so the card and the request badge read the same and the tests
 * pass `now`).
 */

const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

/**
 * How long ago: "just now" (under a minute), "12 min ago", "5 h ago"; from a day back the date
 * and time in English, 24-hour ("Oct 24, 21:46"), so an order number from an earlier day isn't
 * mistaken for today's.
 */
export const formatSince = (iso: string, now = Date.now()): string => {
  const diffMs = Math.max(0, now - new Date(iso).getTime())
  if (diffMs < MINUTE_MS) return 'just now'
  if (diffMs < HOUR_MS) return `${Math.floor(diffMs / MINUTE_MS)} min ago`
  if (diffMs < DAY_MS) return `${Math.floor(diffMs / HOUR_MS)} h ago`
  return new Date(iso).toLocaleString('en', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}
