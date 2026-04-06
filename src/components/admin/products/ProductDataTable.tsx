'use client'
import { useState } from 'react'
import Image from 'next/image'
import { formatNZD } from '@/lib/money'
import ProductStatusBadge from './ProductStatusBadge'
import type { StockStatus, ActiveStatus } from './ProductFilterBar'

export interface ProductWithCategory {
  id: string
  name: string
  sku: string | null
  barcode: string | null
  price_cents: number
  stock_quantity: number
  reorder_threshold: number
  image_url: string | null
  is_active: boolean
  category_id: string | null
  categories: { name: string } | null
  cost_price_cents: number | null
}

/** Calculate gross margin % from GST-inclusive sell price and GST-exclusive cost price.
 * sell_ex_gst = price_cents / 1.15 (strip NZ GST)
 * margin % = (sell_ex_gst - cost_price_cents) / sell_ex_gst * 100
 */
function productMarginPercent(priceCents: number, costPriceCents: number): number {
  const sellExclGst = priceCents / 1.15
  return ((sellExclGst - costPriceCents) / sellExclGst) * 100
}

type SortColumn = 'name' | 'sku' | 'price_cents' | 'stock_quantity'
type SortDirection = 'asc' | 'desc'

interface ProductDataTableProps {
  products: ProductWithCategory[]
  searchQuery: string
  selectedCategoryId: string | null
  stockStatus: StockStatus
  activeStatus: ActiveStatus
  onProductSelect: (product: ProductWithCategory) => void
  hasInventory: boolean
  hasAdvancedReporting: boolean
}

function getStockVariant(product: ProductWithCategory): StockStatus {
  if (product.stock_quantity === 0) return 'out'
  if (product.stock_quantity <= product.reorder_threshold) return 'low'
  return 'in_stock'
}

export default function ProductDataTable({
  products,
  searchQuery,
  selectedCategoryId,
  stockStatus,
  activeStatus,
  onProductSelect,
  hasInventory,
  hasAdvancedReporting,
}: ProductDataTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  function handleSort(column: SortColumn) {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else {
        // third click — clear
        setSortColumn(null)
        setSortDirection('asc')
      }
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // Filter
  const filtered = products.filter((p) => {
    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matchesName = p.name.toLowerCase().includes(q)
      const matchesSku = p.sku ? p.sku.toLowerCase().includes(q) : false
      if (!matchesName && !matchesSku) return false
    }

    // Category filter (sidebar — only when null means "All")
    if (selectedCategoryId !== null && p.category_id !== selectedCategoryId) return false

    // Stock status
    if (stockStatus !== 'all') {
      const variant = getStockVariant(p)
      if (variant !== stockStatus) return false
    }

    // Active status
    if (activeStatus === 'active' && !p.is_active) return false
    if (activeStatus === 'inactive' && p.is_active) return false

    return true
  })

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (!sortColumn) {
      return a.name.localeCompare(b.name)
    }

    let aVal: string | number
    let bVal: string | number

    if (sortColumn === 'name') {
      aVal = a.name.toLowerCase()
      bVal = b.name.toLowerCase()
    } else if (sortColumn === 'sku') {
      aVal = (a.sku ?? '').toLowerCase()
      bVal = (b.sku ?? '').toLowerCase()
    } else {
      aVal = a[sortColumn]
      bVal = b[sortColumn]
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  const SORTABLE_COLUMNS: { key: SortColumn; label: string }[] = [
    { key: 'name', label: 'Name' },
    { key: 'sku', label: 'SKU' },
    { key: 'price_cents', label: 'Price' },
    ...(hasInventory ? [{ key: 'stock_quantity' as SortColumn, label: 'Stock' }] : []),
  ]

  function SortIcon({ column }: { column: SortColumn }) {
    if (sortColumn !== column) {
      return (
        <svg className="w-3.5 h-3.5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    }
    if (sortDirection === 'asc') {
      return (
        <svg className="w-3.5 h-3.5 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      )
    }
    return (
      <svg className="w-3.5 h-3.5 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    )
  }

  if (sorted.length === 0) {
    if (products.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-text-muted mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold font-sans text-text mb-2">No products yet</h3>
          <p className="text-base font-sans text-text-muted">
            Add your first product to start building your catalog.
          </p>
        </div>
      )
    }

    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-text-muted mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold font-sans text-text mb-2">No products match your filters</h3>
        <p className="text-base font-sans text-text-muted">
          Try adjusting your search or clearing the filters.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-navy text-white">
            <th className="w-[56px] px-3 py-3 text-left text-sm font-semibold font-sans">
              {/* Thumbnail */}
            </th>
            {SORTABLE_COLUMNS.map(({ key, label }) => (
              <th key={key} className="px-3 py-3 text-left">
                <button
                  type="button"
                  onClick={() => handleSort(key)}
                  className="flex items-center gap-1 text-sm font-semibold font-sans text-white hover:text-white/80 transition-colors"
                >
                  {label}
                  <SortIcon column={key} />
                </button>
              </th>
            ))}
            <th className="px-3 py-3 text-left text-sm font-semibold font-sans">Category</th>
            {hasAdvancedReporting && (
              <th className="px-4 py-3 text-right text-sm font-bold font-sans">Margin %</th>
            )}
            <th className="px-3 py-3 text-left text-sm font-semibold font-sans">Status</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((product) => (
            <tr
              key={product.id}
              onClick={() => onProductSelect(product)}
              className={[
                'min-h-[48px] border-t border-border cursor-pointer transition-colors hover:bg-surface',
                !product.is_active ? 'opacity-60' : '',
              ].join(' ')}
            >
              {/* Thumbnail */}
              <td className="px-3 py-2">
                <div className="w-10 h-10 rounded overflow-hidden bg-surface flex items-center justify-center flex-shrink-0">
                  {product.image_url ? (
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      width={40}
                      height={40}
                      className="object-cover w-10 h-10"
                    />
                  ) : (
                    <svg
                      className="w-5 h-5 text-navy/40"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      aria-label="No product image"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  )}
                </div>
              </td>

              {/* Name */}
              <td className="px-3 py-2">
                <span className="text-sm font-semibold font-sans text-text">{product.name}</span>
              </td>

              {/* SKU */}
              <td className="px-3 py-2">
                <span className="text-sm font-mono text-text-muted">
                  {product.sku ?? '—'}
                </span>
              </td>

              {/* Price */}
              <td className="px-3 py-2">
                <span
                  className="text-sm font-mono text-text"
                  style={{ fontFeatureSettings: "'tnum' 1" }}
                >
                  {formatNZD(product.price_cents)}
                </span>
              </td>

              {/* Stock — D-07: hidden when hasInventory is false */}
              {hasInventory && (
                <td className="px-3 py-2">
                  <span
                    className="text-sm font-mono text-text"
                    style={{ fontFeatureSettings: "'tnum' 1" }}
                  >
                    {product.stock_quantity}
                  </span>
                </td>
              )}

              {/* Category */}
              <td className="px-3 py-2">
                <span className="text-sm font-sans text-text-muted">
                  {product.categories?.name ?? '—'}
                </span>
              </td>

              {/* Margin % — only shown when advanced reporting add-on is active */}
              {hasAdvancedReporting && (
                <td className="px-4 py-2 text-right">
                  {product.cost_price_cents === null || product.cost_price_cents === undefined ? (
                    <span className="text-sm font-mono text-text-muted">---</span>
                  ) : (() => {
                    const margin = productMarginPercent(product.price_cents, product.cost_price_cents)
                    const colorClass = margin > 30
                      ? 'text-success'
                      : margin >= 15
                        ? 'text-primary'
                        : margin >= 0
                          ? 'text-warning'
                          : 'text-error'
                    return (
                      <span
                        className={`text-sm font-mono ${colorClass}`}
                        style={{ fontFeatureSettings: "'tnum' 1" }}
                      >
                        {margin.toFixed(1)}%
                      </span>
                    )
                  })()}
                </td>
              )}

              {/* Status badge */}
              <td className="px-3 py-2">
                <ProductStatusBadge
                  isActive={product.is_active}
                  stockQuantity={product.stock_quantity}
                  reorderThreshold={product.reorder_threshold}
                  hasInventory={hasInventory}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
