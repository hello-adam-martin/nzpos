'use client'
import { useState } from 'react'

export type StockStatus = 'all' | 'in_stock' | 'low' | 'out'
export type ActiveStatus = 'all' | 'active' | 'inactive'

interface FilterState {
  categoryId: string | null
  stockStatus: StockStatus
  activeStatus: ActiveStatus
}

interface Category {
  id: string
  name: string
}

interface ProductFilterBarProps {
  categories: Category[]
  onFilterChange: (filters: FilterState) => void
}

const STOCK_OPTIONS: { value: StockStatus; label: string }[] = [
  { value: 'all', label: 'All Stock' },
  { value: 'in_stock', label: 'In Stock' },
  { value: 'low', label: 'Low Stock' },
  { value: 'out', label: 'Out of Stock' },
]

const ACTIVE_OPTIONS: { value: ActiveStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

export default function ProductFilterBar({ categories, onFilterChange }: ProductFilterBarProps) {
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [stockStatus, setStockStatus] = useState<StockStatus>('all')
  const [activeStatus, setActiveStatus] = useState<ActiveStatus>('all')

  const hasActiveFilters = categoryId !== null || stockStatus !== 'all' || activeStatus !== 'all'

  function handleCategoryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value || null
    setCategoryId(val)
    onFilterChange({ categoryId: val, stockStatus, activeStatus })
  }

  function handleStockChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value as StockStatus
    setStockStatus(val)
    onFilterChange({ categoryId, stockStatus: val, activeStatus })
  }

  function handleActiveChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value as ActiveStatus
    setActiveStatus(val)
    onFilterChange({ categoryId, stockStatus, activeStatus: val })
  }

  function clearAll() {
    setCategoryId(null)
    setStockStatus('all')
    setActiveStatus('all')
    onFilterChange({ categoryId: null, stockStatus: 'all', activeStatus: 'all' })
  }

  function removeChip(key: 'category' | 'stock' | 'active') {
    const next = {
      categoryId: key === 'category' ? null : categoryId,
      stockStatus: key === 'stock' ? 'all' as StockStatus : stockStatus,
      activeStatus: key === 'active' ? 'all' as ActiveStatus : activeStatus,
    }
    if (key === 'category') setCategoryId(null)
    if (key === 'stock') setStockStatus('all')
    if (key === 'active') setActiveStatus('all')
    onFilterChange(next)
  }

  const selectClass =
    'text-sm font-sans border border-border rounded-[var(--radius-md)] bg-card text-text px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy focus:border-navy transition-colors'

  const activeCategory = categoryId ? categories.find((c) => c.id === categoryId) : null
  const activeStockLabel = STOCK_OPTIONS.find((o) => o.value === stockStatus)?.label
  const activeActiveLabel = ACTIVE_OPTIONS.find((o) => o.value === activeStatus)?.label

  return (
    <div className="flex flex-col gap-2">
      {/* Filter row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Category dropdown */}
        <select
          value={categoryId ?? ''}
          onChange={handleCategoryChange}
          className={selectClass}
          aria-label="Filter by category"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

        {/* Stock status */}
        <select
          value={stockStatus}
          onChange={handleStockChange}
          className={selectClass}
          aria-label="Filter by stock status"
        >
          {STOCK_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Active status */}
        <select
          value={activeStatus}
          onChange={handleActiveChange}
          className={selectClass}
          aria-label="Filter by active status"
        >
          {ACTIVE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="text-sm font-sans text-text-muted hover:text-text underline transition-colors"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          {activeCategory && (
            <Chip label={`Category: ${activeCategory.name}`} onRemove={() => removeChip('category')} />
          )}
          {stockStatus !== 'all' && (
            <Chip label={activeStockLabel!} onRemove={() => removeChip('stock')} />
          )}
          {activeStatus !== 'all' && (
            <Chip label={activeActiveLabel!} onRemove={() => removeChip('active')} />
          )}
        </div>
      )}
    </div>
  )
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-surface border border-border text-sm font-sans text-text">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 text-text-muted hover:text-text transition-colors"
        aria-label={`Remove ${label} filter`}
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </span>
  )
}
