'use client'

import { formatNZD } from '@/lib/money'

interface CashVarianceSummaryProps {
  expectedCashCents: number
  actualCashCents: number
  varianceCents: number
}

export function CashVarianceSummary({
  expectedCashCents,
  actualCashCents,
  varianceCents,
}: CashVarianceSummaryProps) {
  function varianceColor(): string {
    if (varianceCents > 0) return 'text-[var(--color-success)]'
    if (varianceCents === 0) return 'text-[var(--color-text-muted)]'
    if (varianceCents >= -200) return 'text-[var(--color-text-muted)]'
    if (varianceCents >= -500) return 'text-[var(--color-warning)]'
    return 'text-[var(--color-error)]'
  }

  function varianceLabel(): string {
    if (varianceCents > 0) return `Over by ${formatNZD(varianceCents)}`
    if (varianceCents === 0) return 'Balanced'
    return `Short by ${formatNZD(Math.abs(varianceCents))}`
  }

  return (
    <div className="bg-[var(--color-surface)] rounded-md p-4 space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-bold text-[var(--color-text)]">Expected Cash</span>
        <span className="font-mono text-sm font-normal text-[var(--color-text)]">
          {formatNZD(expectedCashCents)}
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-sm font-bold text-[var(--color-text)]">Cash Counted</span>
        <span className="font-mono text-sm font-normal text-[var(--color-text)]">
          {formatNZD(actualCashCents)}
        </span>
      </div>
      <div className="border-t border-[var(--color-border)] pt-2 flex justify-between items-center">
        <span className="text-sm font-bold text-[var(--color-text)]">Variance</span>
        <span className={`font-mono text-sm font-bold ${varianceColor()}`}>
          {varianceLabel()}
        </span>
      </div>
    </div>
  )
}
