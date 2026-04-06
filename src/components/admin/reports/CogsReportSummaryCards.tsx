import { formatNZD } from '@/lib/money'

interface CogsReportSummaryCardsProps {
  totalRevenueExclGstCents: number
  totalCostCents: number
  totalMarginCents: number
  overallMarginPercent: number | null
}

function marginColorClass(value: number | null): string {
  if (value === null) return 'text-muted'
  if (value > 0) return 'text-success'
  if (value < 0) return 'text-error'
  return 'text-muted'
}

function marginPercentColorClass(value: number | null): string {
  if (value === null) return 'text-muted'
  if (value > 30) return 'text-success'
  if (value >= 15) return 'text-primary'
  if (value >= 0) return 'text-warning'
  return 'text-error'
}

export function CogsReportSummaryCards({
  totalRevenueExclGstCents,
  totalCostCents,
  totalMarginCents,
  overallMarginPercent,
}: CogsReportSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* Revenue (excl. GST) */}
      <div className="bg-surface rounded-md px-4 py-4">
        <p className="text-sm font-bold text-muted mb-1">Revenue (excl. GST)</p>
        <p className="font-mono text-xl text-primary">{formatNZD(totalRevenueExclGstCents)}</p>
      </div>

      {/* Total Cost */}
      <div className="bg-surface rounded-md px-4 py-4">
        <p className="text-sm font-bold text-muted mb-1">Total Cost</p>
        <p className="font-mono text-xl text-primary">{formatNZD(totalCostCents)}</p>
      </div>

      {/* Gross Profit */}
      <div className="bg-surface rounded-md px-4 py-4">
        <p className="text-sm font-bold text-muted mb-1">Gross Profit</p>
        <p className={`font-mono text-xl ${marginColorClass(totalMarginCents)}`}>
          {formatNZD(totalMarginCents)}
        </p>
      </div>

      {/* Margin % */}
      <div className="bg-surface rounded-md px-4 py-4">
        <p className="text-sm font-bold text-muted mb-1">Margin %</p>
        <p className={`font-mono text-xl ${marginPercentColorClass(overallMarginPercent)}`}>
          {overallMarginPercent !== null ? `${overallMarginPercent.toFixed(1)}%` : '—'}
        </p>
      </div>
    </div>
  )
}
