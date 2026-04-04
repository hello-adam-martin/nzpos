'use client'

import { useState } from 'react'

type StocktakeLine = {
  id: string
  product_id: string
  system_snapshot_quantity: number
  counted_quantity: number | null
  products: {
    name: string
    sku: string | null
    barcode: string | null
  } | null
}

interface StocktakeReviewTabProps {
  lines: StocktakeLine[]
}

type FilterMode = 'all' | 'variances'

function VarianceCell({ system, counted }: { system: number; counted: number | null }) {
  if (counted === null) {
    return (
      <span className="font-mono text-muted" style={{ fontFeatureSettings: "'tnum' 1" }}>
        —
      </span>
    )
  }

  const variance = counted - system

  if (variance > 0) {
    return (
      <span
        className="font-mono text-success"
        aria-label={`+${variance} (surplus)`}
        style={{ fontFeatureSettings: "'tnum' 1" }}
      >
        +{variance}
      </span>
    )
  }
  if (variance < 0) {
    return (
      <span
        className="font-mono text-error"
        aria-label={`${variance} (shortage)`}
        style={{ fontFeatureSettings: "'tnum' 1" }}
      >
        {variance}
      </span>
    )
  }
  return (
    <span
      className="font-mono text-muted"
      aria-label="0 (no variance)"
      style={{ fontFeatureSettings: "'tnum' 1" }}
    >
      0
    </span>
  )
}

export function StocktakeReviewTab({ lines }: StocktakeReviewTabProps) {
  const [filterMode, setFilterMode] = useState<FilterMode>('variances')

  const counted = lines.filter((l) => l.counted_quantity !== null)
  const withVariance = counted.filter(
    (l) => l.counted_quantity !== null && l.counted_quantity !== l.system_snapshot_quantity
  )
  const notCounted = lines.filter((l) => l.counted_quantity === null)

  const displayedLines =
    filterMode === 'variances'
      ? lines.filter(
          (l) => l.counted_quantity !== null && l.counted_quantity !== l.system_snapshot_quantity
        )
      : lines

  return (
    <div className="space-y-[var(--space-md)]">
      {/* Summary row */}
      <div className="flex gap-[var(--space-lg)] text-sm font-body text-muted">
        <span>
          <strong className="text-text">{counted.length}</strong> products counted
        </span>
        <span>
          <strong className="text-text">{withVariance.length}</strong> with variance
        </span>
        <span>
          <strong className="text-text">{notCounted.length}</strong> not counted
        </span>
      </div>

      {/* Filter toggle */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setFilterMode('all')}
          className={[
            'rounded-full px-3 py-1 text-sm font-body transition-colors cursor-pointer',
            filterMode === 'all'
              ? 'bg-navy text-white'
              : 'bg-surface text-text border border-border hover:bg-border',
          ].join(' ')}
        >
          Show all
        </button>
        <button
          type="button"
          onClick={() => setFilterMode('variances')}
          className={[
            'rounded-full px-3 py-1 text-sm font-body transition-colors cursor-pointer',
            filterMode === 'variances'
              ? 'bg-navy text-white'
              : 'bg-surface text-text border border-border hover:bg-border',
          ].join(' ')}
        >
          Show variances only
        </button>
      </div>

      {/* Review table */}
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-navy text-white text-sm font-bold font-body">
              <th className="text-left px-[var(--space-md)] py-[var(--space-sm)]">Product</th>
              <th className="text-left px-[var(--space-md)] py-[var(--space-sm)]">
                System Qty
              </th>
              <th className="text-left px-[var(--space-md)] py-[var(--space-sm)]">
                Counted Qty
              </th>
              <th className="text-left px-[var(--space-md)] py-[var(--space-sm)]">Variance</th>
            </tr>
          </thead>
          <tbody>
            {displayedLines.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-[var(--space-md)] py-[var(--space-2xl)] text-center text-sm text-muted font-body"
                >
                  {filterMode === 'variances'
                    ? 'No variances found. All counted products match the system quantities.'
                    : 'No products in this stocktake.'}
                </td>
              </tr>
            ) : (
              displayedLines.map((line, i) => (
                <tr
                  key={line.id}
                  className={i % 2 === 0 ? 'bg-card' : 'bg-surface'}
                >
                  <td className="px-[var(--space-md)] py-[var(--space-sm)] text-text font-body">
                    {line.products?.name ?? 'Unknown product'}
                  </td>
                  <td className="px-[var(--space-md)] py-[var(--space-sm)]">
                    <span
                      className="font-mono text-text"
                      style={{ fontFeatureSettings: "'tnum' 1" }}
                    >
                      {line.system_snapshot_quantity}
                    </span>
                  </td>
                  <td className="px-[var(--space-md)] py-[var(--space-sm)]">
                    {line.counted_quantity === null ? (
                      <span className="font-mono text-muted" style={{ fontFeatureSettings: "'tnum' 1" }}>
                        Not counted
                      </span>
                    ) : (
                      <span
                        className="font-mono text-text"
                        style={{ fontFeatureSettings: "'tnum' 1" }}
                      >
                        {line.counted_quantity}
                      </span>
                    )}
                  </td>
                  <td className="px-[var(--space-md)] py-[var(--space-sm)]">
                    <VarianceCell
                      system={line.system_snapshot_quantity}
                      counted={line.counted_quantity}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
