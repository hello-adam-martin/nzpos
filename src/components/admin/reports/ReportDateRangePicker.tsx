'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

interface ReportDateRangePickerProps {
  preset: string
  customFrom?: string
  customTo?: string
}

const PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'gst_1mo', label: 'GST 1-month' },
  { value: 'gst_2mo', label: 'GST 2-month' },
  { value: 'gst_6mo', label: 'GST 6-month' },
  { value: 'custom', label: 'Custom Range' },
] as const

export function ReportDateRangePicker({ preset, customFrom, customTo }: ReportDateRangePickerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') ?? 'sales'

  const today = new Date().toISOString().slice(0, 10)
  const [fromDate, setFromDate] = useState(customFrom ?? today)
  const [toDate, setToDate] = useState(customTo ?? today)

  function handlePresetClick(value: string) {
    if (value === 'custom') {
      const params = new URLSearchParams()
      params.set('preset', 'custom')
      params.set('tab', activeTab)
      params.set('from', fromDate)
      params.set('to', toDate)
      router.push(`/admin/reports?${params.toString()}`)
      return
    }
    const params = new URLSearchParams()
    params.set('preset', value)
    params.set('tab', activeTab)
    router.push(`/admin/reports?${params.toString()}`)
  }

  function handleApply() {
    const params = new URLSearchParams()
    params.set('preset', 'custom')
    params.set('tab', activeTab)
    params.set('from', fromDate)
    params.set('to', toDate)
    router.push(`/admin/reports?${params.toString()}`)
  }

  return (
    <div className="space-y-[var(--space-sm)]">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => handlePresetClick(p.value)}
            className={
              preset === p.value
                ? 'bg-navy text-white px-3 py-1 rounded-full text-sm font-bold'
                : 'bg-transparent border border-border text-navy px-3 py-1 rounded-full text-sm font-bold hover:bg-surface'
            }
          >
            {p.label}
          </button>
        ))}
      </div>

      {preset === 'custom' && (
        <div className="flex items-center gap-[var(--space-sm)] flex-wrap">
          <label className="text-sm font-bold text-primary">From</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="border border-border rounded-md px-2 py-1 text-sm font-mono text-primary bg-card"
          />
          <label className="text-sm font-bold text-primary">To</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="border border-border rounded-md px-2 py-1 text-sm font-mono text-primary bg-card"
          />
          <button
            onClick={handleApply}
            className="bg-navy text-white px-4 py-1 rounded-lg text-sm font-bold hover:bg-navy/90"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  )
}
