import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
  subDays,
} from 'date-fns'

export type DatePreset =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'gst_1mo'
  | 'gst_2mo'
  | 'gst_6mo'

export function getDateRange(preset: DatePreset): { from: Date; to: Date } {
  const now = new Date()

  switch (preset) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) }

    case 'yesterday': {
      const yesterday = subDays(now, 1)
      return { from: startOfDay(yesterday), to: endOfDay(yesterday) }
    }

    case 'this_week':
      // NZ locale: week starts on Monday
      return {
        from: startOfWeek(now, { weekStartsOn: 1 }),
        to: endOfWeek(now, { weekStartsOn: 1 }),
      }

    case 'this_month':
      return { from: startOfMonth(now), to: endOfMonth(now) }

    case 'last_month': {
      const lastMonth = subMonths(now, 1)
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) }
    }

    case 'gst_1mo': {
      const oneMonthAgo = subMonths(now, 1)
      return { from: startOfDay(oneMonthAgo), to: endOfDay(now) }
    }

    case 'gst_2mo': {
      const twoMonthsAgo = subMonths(now, 2)
      return { from: startOfDay(twoMonthsAgo), to: endOfDay(now) }
    }

    case 'gst_6mo': {
      const sixMonthsAgo = subMonths(now, 6)
      return { from: startOfDay(sixMonthsAgo), to: endOfDay(now) }
    }
  }
}
