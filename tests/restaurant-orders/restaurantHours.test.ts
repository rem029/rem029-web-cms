// Opening hours and the business day (rem0018 phase 1 step 1b, src/common/utils/restaurantHours.ts):
// pure, on the restaurant's local wall clock (Intl), so daylight saving days work.
import { describe, expect, it } from 'vitest'

import {
  businessDate,
  isOpenAt,
  nextOpening,
  type OpeningHours,
} from '@/common/utils/restaurantHours'

describe('restaurantHours', () => {
  it('is open inside the hours in the restaurant timezone', () => {
    // arrange: mon 08:00–22:00 in Asia/Qatar
    const hours: OpeningHours[] = [
      { weekday: 'mon', opens: '08:00', closes: '22:00', closed: false },
    ]

    // act: isOpenAt at Monday 09:00 Qatar (06:00 UTC)
    const result = isOpenAt(hours, 'Asia/Qatar', new Date('2026-10-19T06:00:00Z'))

    // assert: true
    expect(result).toBe(true)
  })

  it('is closed on a closed day', () => {
    // arrange: fri closed
    const hours: OpeningHours[] = [{ weekday: 'fri', closed: true }]

    // act: isOpenAt on Friday noon
    const result = isOpenAt(hours, 'Asia/Qatar', new Date('2026-10-23T09:00:00Z'))

    // assert: false
    expect(result).toBe(false)
  })

  it('is open after midnight when it closes at 2am', () => {
    // arrange: sat 18:00–02:00
    const hours: OpeningHours[] = [
      { weekday: 'sat', opens: '18:00', closes: '02:00', closed: false },
    ]

    // act: isOpenAt on Sunday 01:00 local
    const result = isOpenAt(hours, 'Asia/Qatar', new Date('2026-10-24T22:00:00Z'))

    // assert: true
    expect(result).toBe(true)
  })

  it('is always open with no hours set', () => {
    // arrange: []
    const hours: OpeningHours[] = []

    // act: isOpenAt any time
    const result = isOpenAt(hours, 'Asia/Qatar', new Date('2026-10-19T12:00:00Z'))

    // assert: true
    expect(result).toBe(true)
  })

  it('finds the next opening time', () => {
    // arrange: mon 08:00–22:00, tue 08:00–22:00
    const hours: OpeningHours[] = [
      { weekday: 'mon', opens: '08:00', closes: '22:00', closed: false },
      { weekday: 'tue', opens: '08:00', closes: '22:00', closed: false },
    ]

    // act: nextOpening on Monday 23:00
    const result = nextOpening(hours, 'Asia/Qatar', new Date('2026-10-19T20:00:00Z'))

    // assert: { weekday: 'tue', opens: '08:00' }
    expect(result).toEqual({ weekday: 'tue', opens: '08:00' })
  })

  it('counts 1am as the previous business day when the day starts at 4am', () => {
    // arrange: Asia/Qatar, dayStartsAt '04:00'
    const timezone = 'Asia/Qatar'

    // act: businessDate at 2026-10-21 01:00 Qatar
    const result = businessDate(new Date('2026-10-20T22:00:00Z'), timezone, '04:00')

    // assert: '2026-10-20'
    expect(result).toBe('2026-10-20')
  })

  it('switches the business day at midnight by default', () => {
    // arrange: Asia/Qatar, default dayStartsAt
    const timezone = 'Asia/Qatar'

    // act: businessDate at 23:59 and at 00:01 Qatar
    const beforeMidnight = businessDate(new Date('2026-10-20T20:59:00Z'), timezone)
    const afterMidnight = businessDate(new Date('2026-10-20T21:01:00Z'), timezone)

    // assert: '2026-10-20' then '2026-10-21'
    expect(beforeMidnight).toBe('2026-10-20')
    expect(afterMidnight).toBe('2026-10-21')
  })

  it('keeps one business day across a DST change', () => {
    // arrange: Europe/London, dayStartsAt '04:00', the night clocks go back (2026-10-25)
    const timezone = 'Europe/London'
    const instants = [
      '2026-10-24T23:30:00Z',
      '2026-10-25T00:30:00Z',
      '2026-10-25T01:30:00Z',
      '2026-10-25T03:30:00Z',
    ]

    // act: businessDate at 00:30, 01:30 (both), 03:30 local that night
    const dates = instants.map((iso) => businessDate(new Date(iso), timezone, '04:00'))

    // assert: all '2026-10-24'
    expect(dates).toEqual(['2026-10-24', '2026-10-24', '2026-10-24', '2026-10-24'])
  })
})
