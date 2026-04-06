'use client'

import { useState } from 'react'
import { formatNZD } from '@/lib/money'
import type { CogsLineItem } from '@/lib/cogs'

interface CogsReportTableProps {
  data: CogsLineItem[]
}

type SortColumn = 'unitsSold' | 'revenueExclGstCents' | 'costCents' | 'marginCents' | 'marginPercent'
type SortDirection = 'asc' | 'desc'

interface SortState {
  column: SortColumn
  direction: SortDirection
}

function marginPercentColorClass(value: number | null): string {
  if (value === null) return 'text-muted'
  if (value > 30) return 'text-success'
  if (value >= 15) return 'text-primary'
  if (value >= 0) return 'text-warning'
  return 'text-error'
}

function ChevronIcon({ active, direction }: { active: boolean; direction: SortDirection }) {
  if (!active) return null
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="inline ml-1"
    >
      {direction === 'asc' ? (
        <polyline points="2,8 6,4 10,8" />
      ) : (
        <polyline points="2,4 6,8 10,4" />
      )}
    </svg>
  )
}

export function CogsReportTable({ data }: CogsReportTableProps) {
  const [sort, setSort] = useState<SortState | null>(null)

  function handleSort(column: SortColumn) {
    setSort(prev => {
      if (prev?.column === column) {
        return { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { column, direction: 'desc' }
    })
  }

  const sorted = sort
    ? [...data].sort((a, b) => {
        const aVal = a[sort.column] ?? (sort.direction === 'asc' ? Infinity : -Infinity)
        const bVal = b[sort.column] ?? (sort.direction === 'asc' ? Infinity : -Infinity)
        if (aVal < bVal) return sort.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return sort.direction === 'asc' ? 1 : -1
        return 0
      })
    : data

  // Compute footer totals
  const cogsWithCost = data.filter(d => d.hasCostPrice)
  const totalUnitsSold = data.reduce((s, d) => s + d.unitsSold, 0)
  const totalRevenueExclGst = data.reduce((s, d) => s + d.revenueExclGstCents, 0)
  const totalCost = cogsWithCost.reduce((s, d) => s + d.costCents, 0)
  const cogsWithCostRevenue = cogsWithCost.reduce((s, d) => s + d.revenueExclGstCents, 0)
  const totalMargin = cogsWithCostRevenue - totalCost
  const totalMarginPct =
    cogsWithCostRevenue > 0
      ? ((cogsWithCostRevenue - totalCost) / cogsWithCostRevenue) * 100
      : null

  function SortableHeader({
    column,
    children,
    align = 'right',
  }: {
    column: SortColumn
    children: React.ReactNode
    align?: 'left' | 'right'
  }) {
    const isActive = sort?.column === column
    return (
      <th
        className={`px-4 py-3 font-bold cursor-pointer select-none hover:bg-navy/80 ${align === 'right' ? 'text-right' : 'text-left'}`}
        onClick={() => handleSort(column)}
      >
        {children}
        <ChevronIcon active={isActive} direction={sort?.direction ?? 'desc'} />
      </th>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-navy text-white">
            <th className="px-4 py-3 text-left font-bold">Product</th>
            <th className="px-4 py-3 text-left font-bold">Category</th>
            <SortableHeader column="unitsSold">Units Sold</SortableHeader>
            <SortableHeader column="revenueExclGstCents">Revenue excl GST</SortableHeader>
            <SortableHeader column="costCents">Cost</SortableHeader>
            <SortableHeader column="marginCents">Margin $</SortableHeader>
            <SortableHeader column="marginPercent">Margin %</SortableHeader>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr
              key={row.productId ?? row.productName}
              className={`border-t border-border ${i % 2 === 0 ? 'bg-card' : 'bg-surface'}`}
            >
              <td className="px-4 py-3 text-primary">{row.productName}</td>
              <td className="px-4 py-3 text-muted">{row.categoryName ?? '—'}</td>
              <td className="px-4 py-3 text-right font-mono text-primary">{row.unitsSold}</td>
              <td className="px-4 py-3 text-right font-mono text-primary">
                {formatNZD(row.revenueExclGstCents)}
              </td>
              <td className="px-4 py-3 text-right font-mono text-primary">
                {row.hasCostPrice ? formatNZD(row.costCents) : <span className="text-muted">---</span>}
              </td>
              <td className="px-4 py-3 text-right font-mono text-primary">
                {row.marginCents !== null ? (
                  <span className={row.marginCents < 0 ? 'text-error' : row.marginCents === 0 ? 'text-muted' : 'text-primary'}>
                    {formatNZD(row.marginCents)}
                  </span>
                ) : (
                  <span className="text-muted">---</span>
                )}
              </td>
              <td className={`px-4 py-3 text-right font-mono ${marginPercentColorClass(row.marginPercent)}`}>
                {row.marginPercent !== null ? `${row.marginPercent.toFixed(1)}%` : '---'}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-border bg-surface font-bold">
            <td className="px-4 py-3 text-primary">Total</td>
            <td className="px-4 py-3"></td>
            <td className="px-4 py-3 text-right font-mono text-primary">{totalUnitsSold}</td>
            <td className="px-4 py-3 text-right font-mono text-primary">{formatNZD(totalRevenueExclGst)}</td>
            <td className="px-4 py-3 text-right font-mono text-primary">{formatNZD(totalCost)}</td>
            <td className="px-4 py-3 text-right font-mono text-primary">{formatNZD(totalMargin)}</td>
            <td className={`px-4 py-3 text-right font-mono ${marginPercentColorClass(totalMarginPct)}`}>
              {totalMarginPct !== null ? `${totalMarginPct.toFixed(1)}%` : '---'}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
