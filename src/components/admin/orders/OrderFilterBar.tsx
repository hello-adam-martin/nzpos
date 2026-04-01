'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'completed', label: 'Completed' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'pending_pickup', label: 'Pending Pickup' },
  { value: 'ready', label: 'Ready' },
  { value: 'collected', label: 'Collected' },
]

const CHANNEL_OPTIONS = [
  { value: '', label: 'All Channels' },
  { value: 'pos', label: 'POS' },
  { value: 'online', label: 'Online' },
]

const PAYMENT_OPTIONS = [
  { value: '', label: 'All Payments' },
  { value: 'eftpos', label: 'EFTPOS' },
  { value: 'cash', label: 'Cash' },
  { value: 'stripe', label: 'Stripe' },
]

const selectClass =
  'text-sm font-sans border border-border rounded-[var(--radius-md)] bg-card text-text px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy focus:border-navy transition-colors'

export function OrderFilterBar() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      // Reset page to 1 on filter change
      params.delete('page')
      router.push(`?${params.toString()}`)
    },
    [router, searchParams]
  )

  function clearAll() {
    router.push('?')
  }

  const hasActiveFilters =
    searchParams.has('status') ||
    searchParams.has('channel') ||
    searchParams.has('payment_method') ||
    searchParams.has('from') ||
    searchParams.has('to') ||
    searchParams.has('q')

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Status */}
        <select
          value={searchParams.get('status') ?? ''}
          onChange={(e) => updateParam('status', e.target.value)}
          className={selectClass}
          aria-label="Filter by status"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Channel */}
        <select
          value={searchParams.get('channel') ?? ''}
          onChange={(e) => updateParam('channel', e.target.value)}
          className={selectClass}
          aria-label="Filter by channel"
        >
          {CHANNEL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Payment method */}
        <select
          value={searchParams.get('payment_method') ?? ''}
          onChange={(e) => updateParam('payment_method', e.target.value)}
          className={selectClass}
          aria-label="Filter by payment method"
        >
          {PAYMENT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Date range: from */}
        <div className="flex items-center gap-1">
          <label htmlFor="filter-from" className="text-sm font-sans text-text-muted sr-only">
            From
          </label>
          <input
            id="filter-from"
            type="date"
            value={searchParams.get('from') ?? ''}
            onChange={(e) => updateParam('from', e.target.value)}
            className={selectClass}
            placeholder="From"
            aria-label="Filter from date"
          />
        </div>

        {/* Date range: to */}
        <div className="flex items-center gap-1">
          <label htmlFor="filter-to" className="text-sm font-sans text-text-muted sr-only">
            To
          </label>
          <input
            id="filter-to"
            type="date"
            value={searchParams.get('to') ?? ''}
            onChange={(e) => updateParam('to', e.target.value)}
            className={selectClass}
            placeholder="To"
            aria-label="Filter to date"
          />
        </div>

        {/* Search by order ID */}
        <input
          type="search"
          value={searchParams.get('q') ?? ''}
          onChange={(e) => updateParam('q', e.target.value)}
          className={selectClass + ' min-w-[200px]'}
          placeholder="Search by order ID..."
          aria-label="Search by order ID"
        />

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="text-sm font-sans text-text-muted hover:text-text underline transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  )
}
