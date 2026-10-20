/**
 * Opening hours and the business day (rem0018), from the Restaurant tab on Settings. Pure (no
 * `payload`), so the guest page, the order hooks and the report share one answer. Times are the
 * restaurant's local wall clock, read through `Intl.DateTimeFormat` with its timezone: never
 * offset arithmetic, so daylight saving days keep working.
 */

export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

export type Weekday = (typeof WEEKDAYS)[number]

/** One row of Settings → Restaurant → Opening hours; times are `HH:MM`. */
export type OpeningHours = {
  weekday: Weekday
  opens?: string | null
  /** earlier than `opens` = closes after midnight (e.g. 18:00 → 02:00) */
  closes?: string | null
  closed?: boolean | null
}

const SHORT_WEEKDAY_MAP: Record<string, Weekday> = {
  mon: 'mon',
  tue: 'tue',
  wed: 'wed',
  thu: 'thu',
  fri: 'fri',
  sat: 'sat',
  sun: 'sun',
}

const PREV_WEEKDAY: Record<Weekday, Weekday> = {
  mon: 'sun',
  tue: 'mon',
  wed: 'tue',
  thu: 'wed',
  fri: 'thu',
  sat: 'fri',
  sun: 'sat',
}

const NEXT_WEEKDAY: Record<Weekday, Weekday> = {
  mon: 'tue',
  tue: 'wed',
  wed: 'thu',
  thu: 'fri',
  fri: 'sat',
  sat: 'sun',
  sun: 'mon',
}

type LocalParts = {
  year: number
  month: number
  day: number
  weekday: Weekday
  minutes: number
}

const FORMAT: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
}

// an unknown timezone falls back to UTC instead of throwing (validated on save anyway)
const getFormatter = (timezone: string): Intl.DateTimeFormat => {
  try {
    return new Intl.DateTimeFormat('en-US', { ...FORMAT, timeZone: timezone })
  } catch {
    return new Intl.DateTimeFormat('en-US', { ...FORMAT, timeZone: 'UTC' })
  }
}

const localParts = (date: Date, timezone: string): LocalParts => {
  const formatter = getFormatter(timezone)
  const parts = formatter.formatToParts(date)
  let year = 0
  let month = 0
  let day = 0
  let weekday: Weekday = 'mon'
  let hour = 0
  let minute = 0

  for (const part of parts) {
    if (part.type === 'year') {
      year = Number(part.value)
    } else if (part.type === 'month') {
      month = Number(part.value)
    } else if (part.type === 'day') {
      day = Number(part.value)
    } else if (part.type === 'weekday') {
      const lower = part.value.toLowerCase()
      weekday = SHORT_WEEKDAY_MAP[lower] ?? 'mon'
    } else if (part.type === 'hour') {
      hour = Number(part.value) % 24
    } else if (part.type === 'minute') {
      minute = Number(part.value)
    }
  }

  const minutes = hour * 60 + minute
  return { year, month, day, weekday, minutes }
}

const toMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

/** Whether the restaurant is open at `date`. No rows at all = always open (nothing set yet). */
export const isOpenAt = (hours: OpeningHours[], timezone: string, date: Date): boolean => {
  if (hours.length === 0) {
    return true
  }

  const { weekday, minutes } = localParts(date, timezone)

  const todayRow = hours.find((h) => h.weekday === weekday)
  if (todayRow && !todayRow.closed && todayRow.opens) {
    const opens = toMinutes(todayRow.opens)
    if (todayRow.closes) {
      const closes = toMinutes(todayRow.closes)
      if (closes > opens) {
        if (minutes >= opens && minutes < closes) {
          return true
        }
      } else if (minutes >= opens) {
        return true
      }
    } else if (minutes >= opens) {
      return true
    }
  }

  const yesterday = PREV_WEEKDAY[weekday]
  const yesterdayRow = hours.find((h) => h.weekday === yesterday)
  if (yesterdayRow && !yesterdayRow.closed && yesterdayRow.opens && yesterdayRow.closes) {
    const yOpens = toMinutes(yesterdayRow.opens)
    const yCloses = toMinutes(yesterdayRow.closes)
    if (yCloses < yOpens && minutes < yCloses) {
      return true
    }
  }

  return false
}

/** The next time it opens after `date` (within 7 days), or `null` when every day is closed. */
export const nextOpening = (
  hours: OpeningHours[],
  timezone: string,
  date: Date,
): { weekday: Weekday; opens: string } | null => {
  const { weekday, minutes } = localParts(date, timezone)

  const todayRow = hours.find((h) => h.weekday === weekday)
  if (todayRow && !todayRow.closed && todayRow.opens) {
    const todayOpens = toMinutes(todayRow.opens)
    if (todayOpens > minutes) {
      return { weekday, opens: todayRow.opens }
    }
  }

  let current = NEXT_WEEKDAY[weekday]
  for (let i = 1; i < 7; i++) {
    const row = hours.find((h) => h.weekday === current)
    if (row && !row.closed && row.opens) {
      return { weekday: current, opens: row.opens }
    }
    current = NEXT_WEEKDAY[current]
  }

  return null
}

/**
 * The business day `date` belongs to, as `YYYY-MM-DD`: the local date in `timezone` after
 * taking `dayStartsAt` (`HH:MM`, default `00:00`) off the local time, so with 04:00 an order at
 * 01:30 counts for the day before. Order numbers restart and reports count by it.
 */
export const businessDate = (date: Date, timezone: string, dayStartsAt = '00:00'): string => {
  const { year, month, day, minutes } = localParts(date, timezone)
  const thresholdMinutes = toMinutes(dayStartsAt)

  let y = year
  let m = month
  let d = day

  if (minutes < thresholdMinutes) {
    const prevDate = new Date(Date.UTC(year, month - 1, day - 1))
    y = prevDate.getUTCFullYear()
    m = prevDate.getUTCMonth() + 1
    d = prevDate.getUTCDate()
  }

  const mm = String(m).padStart(2, '0')
  const dd = String(d).padStart(2, '0')
  return `${y}-${mm}-${dd}`
}
