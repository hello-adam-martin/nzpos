'use client'

import Papa from 'papaparse'

interface ExportCSVButtonProps {
  data: Record<string, unknown>[]
  filename: string
  label?: string
}

export function ExportCSVButton({ data, filename, label = 'Export CSV' }: ExportCSVButtonProps) {
  function handleClick() {
    // Transform cents to dollars for CSV consumers
    const transformed = data.map((row) => {
      const out: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(row)) {
        if (typeof value === 'number' && key.endsWith('_cents')) {
          // Convert cents to dollars with 2 decimal places
          const dollarKey = key.replace('_cents', '_dollars')
          out[dollarKey] = (value / 100).toFixed(2)
        } else {
          out[key] = value
        }
      }
      return out
    })

    const csv = Papa.unparse(transformed)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${filename}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-2 bg-amber text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-amber/90 transition-colors"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      {label}
    </button>
  )
}
