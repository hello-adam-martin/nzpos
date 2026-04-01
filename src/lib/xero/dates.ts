import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import { format } from 'date-fns'

const NZ_TZ = 'Pacific/Auckland'

/**
 * Returns UTC Date boundaries for the previous NZ calendar day.
 * Used by the automated cron job to compute the period to sync.
 *
 * Example: if called at 2026-01-16T01:00:00Z (= 2026-01-16T14:00:00 NZDT),
 * returns boundaries for 2026-01-15 in NZDT (UTC+13).
 */
export function getNZDayBoundaries(referenceDate?: Date): { from: Date; to: Date; label: string } {
  const now = referenceDate ?? new Date()

  // Convert reference time to NZ local time
  const nzNow = toZonedTime(now, NZ_TZ)

  // Compute previous NZ calendar day midnight
  const nzYesterday = new Date(nzNow)
  nzYesterday.setDate(nzNow.getDate() - 1)
  nzYesterday.setHours(0, 0, 0, 0)

  // Compute previous NZ calendar day 23:59:59.999
  const nzYesterdayEnd = new Date(nzYesterday)
  nzYesterdayEnd.setHours(23, 59, 59, 999)

  return {
    from: fromZonedTime(nzYesterday, NZ_TZ),    // UTC equivalent of NZ midnight
    to: fromZonedTime(nzYesterdayEnd, NZ_TZ),   // UTC equivalent of NZ 23:59:59.999
    label: format(nzYesterday, 'yyyy-MM-dd'),
  }
}

/**
 * Returns UTC Date boundaries for the current NZ calendar day from midnight to reference time.
 * Used by manual sync to capture "today so far".
 *
 * Example: if called at 2026-01-15T01:00:00Z (= 2026-01-15T14:00:00 NZDT),
 * returns from = 2026-01-14T11:00:00Z (NZ midnight), to = 2026-01-15T01:00:00Z (now).
 */
export function getNZTodayBoundaries(referenceDate?: Date): { from: Date; to: Date; label: string } {
  const now = referenceDate ?? new Date()

  // Convert reference time to NZ local time
  const nzNow = toZonedTime(now, NZ_TZ)

  // Current NZ calendar day midnight
  const nzToday = new Date(nzNow)
  nzToday.setHours(0, 0, 0, 0)

  return {
    from: fromZonedTime(nzToday, NZ_TZ),  // UTC equivalent of NZ midnight today
    to: now,                                // reference time (now) as the upper bound
    label: format(nzToday, 'yyyy-MM-dd'),
  }
}
