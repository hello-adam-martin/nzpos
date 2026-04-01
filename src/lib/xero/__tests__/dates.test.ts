import { describe, it, expect } from 'vitest'
import { getNZDayBoundaries, getNZTodayBoundaries } from '../dates'

/**
 * NZ timezone boundary tests.
 *
 * NZ observes:
 * - NZDT (UTC+13): October → first Sunday of April (daylight saving)
 * - NZST (UTC+12): April → September (standard time)
 *
 * Test dates used:
 * - NZDT period: 2026-01-15 (summer, UTC+13)
 * - NZST period: 2026-06-15 (winter, UTC+12)
 * - DST end transition: 2026-04-05 (first Sunday April, clocks go back)
 */

describe('getNZDayBoundaries', () => {
  it('returns previous NZ calendar day from NZDT period (UTC+13, summer)', () => {
    // Reference: 2026-01-16 01:00:00 UTC = 2026-01-16 14:00:00 NZDT
    // Previous NZ day = 2026-01-15
    // NZ midnight 2026-01-15 00:00:00 NZDT = 2026-01-14 11:00:00 UTC
    // NZ 23:59:59.999 2026-01-15 NZDT = 2026-01-15 10:59:59.999 UTC
    const ref = new Date('2026-01-16T01:00:00Z')
    const { from, to, label } = getNZDayBoundaries(ref)

    expect(label).toBe('2026-01-15')
    // 2026-01-15 00:00:00 NZDT (UTC+13) = 2026-01-14 11:00:00 UTC
    expect(from.toISOString()).toBe('2026-01-14T11:00:00.000Z')
    // 2026-01-15 23:59:59.999 NZDT (UTC+13) = 2026-01-15 10:59:59.999 UTC
    expect(to.toISOString()).toBe('2026-01-15T10:59:59.999Z')
  })

  it('returns previous NZ calendar day from NZST period (UTC+12, winter)', () => {
    // Reference: 2026-06-16 02:00:00 UTC = 2026-06-16 14:00:00 NZST
    // Previous NZ day = 2026-06-15
    // NZ midnight 2026-06-15 00:00:00 NZST = 2026-06-14 12:00:00 UTC
    // NZ 23:59:59.999 2026-06-15 NZST = 2026-06-15 11:59:59.999 UTC
    const ref = new Date('2026-06-16T02:00:00Z')
    const { from, to, label } = getNZDayBoundaries(ref)

    expect(label).toBe('2026-06-15')
    // 2026-06-15 00:00:00 NZST (UTC+12) = 2026-06-14 12:00:00 UTC
    expect(from.toISOString()).toBe('2026-06-14T12:00:00.000Z')
    // 2026-06-15 23:59:59.999 NZST (UTC+12) = 2026-06-15 11:59:59.999 UTC
    expect(to.toISOString()).toBe('2026-06-15T11:59:59.999Z')
  })

  it('returns correct label format YYYY-MM-DD', () => {
    const ref = new Date('2026-03-15T02:00:00Z')
    const { label } = getNZDayBoundaries(ref)
    expect(label).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('returns from date that is strictly before to date', () => {
    const ref = new Date('2026-01-16T01:00:00Z')
    const { from, to } = getNZDayBoundaries(ref)
    expect(from.getTime()).toBeLessThan(to.getTime())
  })

  it('DST transition — clocks go back in April (NZDT → NZST)', () => {
    // 2026-04-05 is the first Sunday of April — DST ends, clocks go back from UTC+13 to UTC+12
    // Reference: 2026-04-06 02:00:00 UTC = 2026-04-06 14:00:00 NZST (UTC+12, already post-transition)
    // Previous NZ day = 2026-04-05
    // 2026-04-05 is itself a transition day: midnight starts in NZDT (UTC+13)
    // 2026-04-05 00:00:00 NZDT (UTC+13) = 2026-04-04 11:00:00 UTC
    // 2026-04-05 23:59:59.999 — by then NZ has switched to NZST (UTC+12) so end of day is UTC+12
    // The function correctly uses the offset at midnight of 2026-04-05 which is still NZDT
    const ref = new Date('2026-04-06T02:00:00Z')
    const { label, from } = getNZDayBoundaries(ref)

    expect(label).toBe('2026-04-05')
    // Midnight 2026-04-05 is in NZDT context (UTC+13) = 2026-04-04T11:00:00Z
    expect(from.toISOString()).toBe('2026-04-04T11:00:00.000Z')
  })

  it('DST transition — clocks go forward in September (NZST → NZDT)', () => {
    // NZ DST starts last Sunday of September
    // 2026-09-27 is approximately last Sunday of September
    // Reference: 2026-09-28 02:00:00 UTC
    // After DST starts: NZ is UTC+13
    // 2026-09-27 00:00:00 NZDT (UTC+13) = 2026-09-26 11:00:00 UTC
    const ref = new Date('2026-09-28T02:00:00Z')
    const { label } = getNZDayBoundaries(ref)
    expect(label).toBe('2026-09-27')
  })
})

describe('getNZTodayBoundaries', () => {
  it('returns current NZ calendar day from midnight to reference time', () => {
    // Reference: 2026-01-15 14:00:00 NZDT (UTC+13) = 2026-01-15 01:00:00 UTC
    const ref = new Date('2026-01-15T01:00:00Z')
    const { from, to, label } = getNZTodayBoundaries(ref)

    expect(label).toBe('2026-01-15')
    // midnight NZDT 2026-01-15 = 2026-01-14T11:00:00Z
    expect(from.toISOString()).toBe('2026-01-14T11:00:00.000Z')
    // to = the reference time itself (2026-01-15 01:00:00 UTC)
    expect(to.toISOString()).toBe('2026-01-15T01:00:00.000Z')
  })

  it('returns from date equal to NZ day midnight (UTC equivalent)', () => {
    const ref = new Date('2026-06-15T14:00:00Z') // NZST: 2026-06-16 02:00:00
    const { from, label } = getNZTodayBoundaries(ref)
    expect(label).toBe('2026-06-16')
    // midnight NZST 2026-06-16 = 2026-06-15T12:00:00Z
    expect(from.toISOString()).toBe('2026-06-15T12:00:00.000Z')
  })

  it('to equals the reference date exactly', () => {
    const ref = new Date('2026-03-10T05:30:00Z')
    const { to } = getNZTodayBoundaries(ref)
    expect(to.toISOString()).toBe(ref.toISOString())
  })
})
