'use client'

interface PeriodToggleProps {
  period: 7 | 30
  onChange: (period: 7 | 30) => void
}

export function PeriodToggle({ period, onChange }: PeriodToggleProps) {
  return (
    <div className="flex rounded-full border border-[var(--color-border)] overflow-hidden">
      <button
        type="button"
        onClick={() => onChange(7)}
        className={`px-3 py-1 text-sm transition-colors duration-150 ${
          period === 7
            ? 'bg-[var(--color-amber)] text-white font-bold'
            : 'bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
        }`}
      >
        7 days
      </button>
      <button
        type="button"
        onClick={() => onChange(30)}
        className={`px-3 py-1 text-sm transition-colors duration-150 ${
          period === 30
            ? 'bg-[var(--color-amber)] text-white font-bold'
            : 'bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
        }`}
      >
        30 days
      </button>
    </div>
  )
}
