'use client'

import { useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { getAdjustmentHistory } from '@/actions/inventory/getAdjustmentHistory'
import { ALL_REASON_CODES, REASON_CODE_LABELS } from '@/schemas/inventory'
import type { ReasonCode } from '@/schemas/inventory'

interface AdjustmentRow {
  id: string
  created_at: string
  product_id: string
  quantity_delta: number
  quantity_after: number
  reason: string
  notes: string | null
  staff_id: string | null
  products: { name: string; sku: string | null } | null
}

export function InventoryHistoryTab() {
  const [rows, setRows] = useState<AdjustmentRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  // Filters
  const [productFilter, setProductFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [reasonFilter, setReasonFilter] = useState('')

  const hasActiveFilters = productFilter || fromDate || toDate || reasonFilter

  const loadHistory = useCallback(async (pageNum: number) => {
    setIsLoading(true)
    setLoadError(false)

    const result = await getAdjustmentHistory({
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      reason: reasonFilter || undefined,
      page: pageNum,
    })

    setIsLoading(false)

    if ('error' in result) {
      setLoadError(true)
      return
    }

    // Filter by product name client-side (no productId filter available without a search endpoint)
    let filtered = result.rows as AdjustmentRow[]
    if (productFilter) {
      const q = productFilter.toLowerCase()
      filtered = filtered.filter(r =>
        r.products?.name?.toLowerCase().includes(q) ||
        r.products?.sku?.toLowerCase().includes(q)
      )
    }

    setRows(filtered)
    setTotal(result.total)
    setPage(result.page)
    setPageSize(result.pageSize)
  }, [productFilter, fromDate, toDate, reasonFilter])

  useEffect(() => {
    loadHistory(1)
  }, [loadHistory])

  function clearFilters() {
    setProductFilter('')
    setFromDate('')
    setToDate('')
    setReasonFilter('')
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  if (loadError) {
    return (
      <div className="py-[var(--space-xl)] text-center">
        <p className="text-sm text-error font-body">
          Couldn&apos;t load adjustment history. Reload the page to try again.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-[var(--space-md)]">
      {/* Filter bar */}
      <div className="flex items-center gap-4 flex-wrap">
        <input
          type="text"
          placeholder="Filter by product..."
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          className="px-3 py-2 text-sm font-body border border-border rounded-[var(--radius-md)] bg-card text-text focus:outline-none focus:ring-2 focus:ring-navy focus:border-navy w-48"
        />
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="px-3 py-2 text-sm font-body border border-border rounded-[var(--radius-md)] bg-card text-text focus:outline-none focus:ring-2 focus:ring-navy focus:border-navy"
          aria-label="From date"
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="px-3 py-2 text-sm font-body border border-border rounded-[var(--radius-md)] bg-card text-text focus:outline-none focus:ring-2 focus:ring-navy focus:border-navy"
          aria-label="To date"
        />
        <select
          value={reasonFilter}
          onChange={(e) => setReasonFilter(e.target.value)}
          className="px-3 py-2 text-sm font-body border border-border rounded-[var(--radius-md)] bg-card text-text focus:outline-none focus:ring-2 focus:ring-navy focus:border-navy"
        >
          <option value="">All reasons</option>
          {ALL_REASON_CODES.map((code) => (
            <option key={code} value={code}>
              {REASON_CODE_LABELS[code as ReasonCode]}
            </option>
          ))}
        </select>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-sm font-body font-bold text-muted hover:text-text transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="py-[var(--space-xl)] text-center">
          <p className="text-sm text-muted font-body">Loading...</p>
        </div>
      )}

      {/* Empty states */}
      {!isLoading && rows.length === 0 && !hasActiveFilters && (
        <div className="py-[var(--space-2xl)] text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-surface mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm font-bold text-text mb-1">No adjustment history</p>
          <p className="text-sm text-muted">Manual adjustments, sales, and stocktakes will appear here once inventory activity begins.</p>
        </div>
      )}

      {!isLoading && rows.length === 0 && hasActiveFilters && (
        <div className="py-[var(--space-2xl)] text-center">
          <p className="text-sm font-bold text-text mb-1">No matching adjustments</p>
          <p className="text-sm text-muted mb-3">Try adjusting the filters or clearing the date range.</p>
          <button
            type="button"
            onClick={clearFilters}
            className="text-sm font-bold text-amber hover:text-amber/80 transition-colors"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Table */}
      {!isLoading && rows.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-navy text-white">
                  <th className="px-4 py-3 text-left font-bold font-body">Date</th>
                  <th className="px-4 py-3 text-left font-bold font-body">Product</th>
                  <th className="px-4 py-3 text-left font-bold font-body">Reason</th>
                  <th className="px-4 py-3 text-right font-bold font-body">Change</th>
                  <th className="px-4 py-3 text-right font-bold font-body">New Total</th>
                  <th className="px-4 py-3 text-left font-bold font-body">Notes</th>
                  <th className="px-4 py-3 text-left font-bold font-body">User</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const isPositive = row.quantity_delta > 0
                  const isNegative = row.quantity_delta < 0
                  return (
                    <tr
                      key={row.id}
                      className={`border-t border-border ${i % 2 === 0 ? 'bg-card' : 'bg-surface'}`}
                    >
                      <td className="px-4 py-3 text-text font-body whitespace-nowrap">
                        {format(new Date(row.created_at), 'dd MMM yyyy HH:mm')}
                      </td>
                      <td className="px-4 py-3 text-text font-body">
                        {row.products?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-text font-body">
                        {REASON_CODE_LABELS[row.reason as ReasonCode] ?? row.reason}
                      </td>
                      <td
                        className={[
                          'px-4 py-3 text-right font-mono',
                          isPositive ? 'text-success font-bold' : '',
                          isNegative ? 'text-error font-bold' : '',
                          !isPositive && !isNegative ? 'text-muted' : '',
                        ].join(' ')}
                        style={{ fontFeatureSettings: "'tnum' 1" }}
                      >
                        {isPositive ? '+' : ''}{row.quantity_delta}
                      </td>
                      <td
                        className="px-4 py-3 text-right font-mono text-text"
                        style={{ fontFeatureSettings: "'tnum' 1" }}
                      >
                        {row.quantity_after}
                      </td>
                      <td className="px-4 py-3 text-muted font-body max-w-[200px]">
                        {row.notes ? (
                          <span
                            title={row.notes.length > 50 ? row.notes : undefined}
                            className="block truncate"
                          >
                            {row.notes}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-muted font-body">
                        {row.staff_id ? 'Staff' : 'System'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted font-body">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => loadHistory(page - 1)}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-sm font-bold font-body border border-border rounded-[var(--radius-md)] text-text hover:bg-surface transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => loadHistory(page + 1)}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 text-sm font-bold font-body border border-border rounded-[var(--radius-md)] text-text hover:bg-surface transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
