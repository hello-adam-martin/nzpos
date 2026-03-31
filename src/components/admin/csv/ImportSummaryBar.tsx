'use client'

interface ImportSummaryBarProps {
  newCount: number
  duplicateCount: number
  errorCount: number
}

export function ImportSummaryBar({ newCount, duplicateCount, errorCount }: ImportSummaryBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 py-2">
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
        {newCount} new
      </span>
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700">
        {duplicateCount} skipped
      </span>
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">
        {errorCount} errors
      </span>
    </div>
  )
}
