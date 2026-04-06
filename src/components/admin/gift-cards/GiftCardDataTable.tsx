'use client'
import { useState, useCallback, useTransition } from 'react'
import { formatNZD } from '@/lib/money'
import { GiftCardStatusBadge } from './GiftCardStatusBadge'
import { listGiftCards, type GiftCardListRow } from '@/actions/gift-cards/listGiftCards'
import { GiftCardDetailDrawer } from './GiftCardDetailDrawer'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type GiftCardStatus = 'all' | 'active' | 'redeemed' | 'expired' | 'voided'
type SortBy = 'issued_at' | 'expires_at' | 'balance_cents' | 'original_value_cents'
type SortOrder = 'asc' | 'desc'

interface GiftCardDataTableProps {
  initialData: GiftCardListRow[]
  initialTotal: number
  role: 'owner' | 'manager' | 'staff'
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NZ_DATE_FORMAT = new Intl.DateTimeFormat('en-NZ', {
  dateStyle: 'medium',
})

const STATUS_OPTIONS: { value: GiftCardStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'redeemed', label: 'Redeemed' },
  { value: 'expired', label: 'Expired' },
  { value: 'voided', label: 'Voided' },
]

const PAGE_SIZE = 20

function isExpiringWithin30Days(expiresAt: string): boolean {
  const expiry = new Date(expiresAt)
  const now = new Date()
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
  return expiry > now && expiry.getTime() - now.getTime() <= thirtyDaysMs
}

function SortIcon({ column, current, order }: { column: SortBy; current: SortBy; order: SortOrder }) {
  if (current !== column) {
    return (
      <svg className="w-3.5 h-3.5 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    )
  }
  if (order === 'asc') {
    return (
      <svg className="w-3.5 h-3.5 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      </svg>
    )
  }
  return (
    <svg className="w-3.5 h-3.5 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GiftCardDataTable({ initialData, initialTotal, role }: GiftCardDataTableProps) {
  const [data, setData] = useState<GiftCardListRow[]>(initialData)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<GiftCardStatus>('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('issued_at')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const fetchData = useCallback(
    (opts: {
      page: number
      status: GiftCardStatus
      search: string
      sortBy: SortBy
      sortOrder: SortOrder
    }) => {
      startTransition(async () => {
        const result = await listGiftCards({
          page: opts.page,
          pageSize: PAGE_SIZE,
          status: opts.status,
          search: opts.search || undefined,
          sortBy: opts.sortBy,
          sortOrder: opts.sortOrder,
        })
        if (result.success) {
          setData(result.data)
          setTotal(result.total)
        }
      })
    },
    []
  )

  function handleStatusChange(newStatus: GiftCardStatus) {
    setStatusFilter(newStatus)
    setPage(1)
    fetchData({ page: 1, status: newStatus, search, sortBy, sortOrder })
  }

  function handleSearchChange(newSearch: string) {
    setSearch(newSearch)
    setPage(1)
    fetchData({ page: 1, status: statusFilter, search: newSearch, sortBy, sortOrder })
  }

  function handleSort(column: SortBy) {
    const newOrder = sortBy === column && sortOrder === 'desc' ? 'asc' : 'desc'
    setSortBy(column)
    setSortOrder(newOrder)
    setPage(1)
    fetchData({ page: 1, status: statusFilter, search, sortBy: column, sortOrder: newOrder })
  }

  function handlePageChange(newPage: number) {
    setPage(newPage)
    fetchData({ page: newPage, status: statusFilter, search, sortBy, sortOrder })
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value as GiftCardStatus)}
          className="px-3 py-2 border border-border rounded-[var(--radius-md)] text-sm font-sans text-text bg-card focus:outline-none focus:ring-2 focus:ring-navy/30 min-w-[140px]"
          aria-label="Filter by status"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {/* Search input */}
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search by last 4 digits"
          maxLength={4}
          className="flex-1 px-3 py-2 border border-border rounded-[var(--radius-md)] text-sm font-sans text-text bg-card placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-navy/30"
          aria-label="Search by last 4 digits of gift card code"
        />
      </div>

      {/* Table */}
      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-border rounded-[var(--radius-md)]">
          <div className="text-text-muted mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a4 4 0 00-4-4H6a4 4 0 00-4 4v2h20V6a4 4 0 00-4-4h-2a4 4 0 00-4 4v2M2 10h20" />
            </svg>
          </div>
          <h3 className="text-xl font-bold font-sans text-text mb-2">No gift cards yet</h3>
          <p className="text-base font-sans text-text-muted">
            When customers purchase gift cards, they will appear here.
          </p>
        </div>
      ) : (
        <div className={['overflow-x-auto rounded-[var(--radius-md)] border border-border', isPending ? 'opacity-70' : ''].join(' ').trim()}>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-navy text-white">
                {/* Code */}
                <th className="px-3 py-3 text-left text-sm font-bold font-sans w-[100px]">
                  Code
                </th>

                {/* Original value — sortable */}
                <th className="px-3 py-3 text-right w-[100px]">
                  <button
                    type="button"
                    onClick={() => handleSort('original_value_cents')}
                    className="flex items-center gap-1 text-sm font-bold font-sans text-white hover:text-white/80 transition-colors ml-auto"
                  >
                    Value
                    <SortIcon column="original_value_cents" current={sortBy} order={sortOrder} />
                  </button>
                </th>

                {/* Remaining balance — sortable */}
                <th className="px-3 py-3 text-right w-[120px]">
                  <button
                    type="button"
                    onClick={() => handleSort('balance_cents')}
                    className="flex items-center gap-1 text-sm font-bold font-sans text-white hover:text-white/80 transition-colors ml-auto"
                  >
                    Balance
                    <SortIcon column="balance_cents" current={sortBy} order={sortOrder} />
                  </button>
                </th>

                {/* Status */}
                <th className="px-3 py-3 text-center text-sm font-bold font-sans w-[100px]">
                  Status
                </th>

                {/* Issued — sortable */}
                <th className="px-3 py-3 text-left w-[120px]">
                  <button
                    type="button"
                    onClick={() => handleSort('issued_at')}
                    className="flex items-center gap-1 text-sm font-bold font-sans text-white hover:text-white/80 transition-colors"
                  >
                    Issued
                    <SortIcon column="issued_at" current={sortBy} order={sortOrder} />
                  </button>
                </th>

                {/* Expires — sortable */}
                <th className="px-3 py-3 text-left w-[120px]">
                  <button
                    type="button"
                    onClick={() => handleSort('expires_at')}
                    className="flex items-center gap-1 text-sm font-bold font-sans text-white hover:text-white/80 transition-colors"
                  >
                    Expires
                    <SortIcon column="expires_at" current={sortBy} order={sortOrder} />
                  </button>
                </th>

                {/* Actions */}
                <th className="px-3 py-3 text-center text-sm font-bold font-sans w-[60px]">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((card) => (
                <tr
                  key={card.id}
                  onClick={() => setSelectedCardId(card.id)}
                  className="min-h-[48px] border-t border-border cursor-pointer transition-colors hover:bg-surface"
                >
                  {/* Code — last 4 digits in font-mono */}
                  <td className="px-3 py-3">
                    <span className="text-sm font-mono text-text">
                      ****-{card.codeLast4}
                    </span>
                  </td>

                  {/* Original value */}
                  <td className="px-3 py-3 text-right">
                    <span
                      className="text-sm font-mono text-text"
                      style={{ fontFeatureSettings: "'tnum' 1" }}
                    >
                      {formatNZD(card.original_value_cents)}
                    </span>
                  </td>

                  {/* Remaining balance — bold if > 0 */}
                  <td className="px-3 py-3 text-right">
                    <span
                      className={['text-sm font-mono', card.balance_cents > 0 ? 'text-text font-bold' : 'text-text-muted'].join(' ')}
                      style={{ fontFeatureSettings: "'tnum' 1" }}
                    >
                      {formatNZD(card.balance_cents)}
                    </span>
                  </td>

                  {/* Status badge */}
                  <td className="px-3 py-3 text-center">
                    <GiftCardStatusBadge status={card.status} />
                  </td>

                  {/* Issued date */}
                  <td className="px-3 py-3">
                    <span className="text-sm font-sans text-text">
                      {NZ_DATE_FORMAT.format(new Date(card.issued_at))}
                    </span>
                  </td>

                  {/* Expires date — warning color if within 30 days */}
                  <td className="px-3 py-3">
                    <span
                      className={[
                        'text-sm font-sans',
                        card.status === 'active' && isExpiringWithin30Days(card.expires_at)
                          ? 'text-[var(--color-warning)] font-medium'
                          : 'text-text',
                      ].join(' ')}
                    >
                      {NZ_DATE_FORMAT.format(new Date(card.expires_at))}
                    </span>
                  </td>

                  {/* Eye icon action button */}
                  <td className="px-3 py-3 text-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedCardId(card.id)
                      }}
                      className="w-8 h-8 inline-flex items-center justify-center rounded-[var(--radius-md)] text-text-muted hover:text-text hover:bg-surface transition-colors"
                      aria-label="View gift card details"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-sm font-sans text-text-muted">
            {total} total
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1 || isPending}
              className="px-3 py-1.5 text-sm font-sans font-medium border border-border rounded-[var(--radius-md)] text-text hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="text-sm font-sans text-text-muted px-2">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages || isPending}
              className="px-3 py-1.5 text-sm font-sans font-medium border border-border rounded-[var(--radius-md)] text-text hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Detail drawer */}
      <GiftCardDetailDrawer
        giftCardId={selectedCardId}
        onClose={() => setSelectedCardId(null)}
        role={role === 'owner' ? 'owner' : 'manager'}
      />
    </div>
  )
}
