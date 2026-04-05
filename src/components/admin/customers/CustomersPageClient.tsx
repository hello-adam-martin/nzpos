'use client'
import { useState, useEffect } from 'react'
import type { CustomerListItem } from '@/actions/customers/getCustomers'
import CustomerTable from './CustomerTable'

const PAGE_SIZE = 20

interface CustomersPageClientProps {
  customers: CustomerListItem[]
}

export default function CustomersPageClient({ customers }: CustomersPageClientProps) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(0)

  // 300ms debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.toLowerCase())
      setPage(0)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const filtered = customers.filter(
    (c) =>
      (c.name ?? '').toLowerCase().includes(debouncedSearch) ||
      c.email.toLowerCase().includes(debouncedSearch)
  )

  const totalFiltered = filtered.length
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(totalFiltered / PAGE_SIZE)

  const showingStart = totalFiltered === 0 ? 0 : page * PAGE_SIZE + 1
  const showingEnd = Math.min((page + 1) * PAGE_SIZE, totalFiltered)

  return (
    <div className="flex flex-col gap-[var(--space-xl)]">
      {/* Page header */}
      <div>
        <h1 className="font-display font-bold text-2xl text-[var(--color-text)]">Customers</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">Manage your customer accounts.</p>
      </div>

      {/* Search bar — focal point per D-01 */}
      <div className="w-full md:max-w-sm">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          autoFocus
          className="w-full h-10 px-3 rounded-md border border-[var(--color-border)] bg-white text-sm font-sans text-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-navy)]/20 focus:border-[var(--color-navy)]/40 outline-none"
        />
      </div>

      {/* Empty state — no customers at all */}
      {customers.length === 0 ? (
        <div className="py-16 text-center bg-[var(--color-card)] rounded-[var(--radius-md)] border border-[var(--color-border)]">
          <p className="text-sm text-[var(--color-text-muted)]">
            No customers yet. Orders placed on your online store will appear here.
          </p>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="bg-[var(--color-card)] rounded-[var(--radius-md)] border border-[var(--color-border)]">
            <CustomerTable customers={paged} />
          </div>

          {/* Pagination footer */}
          {totalFiltered > 0 && (
            <div className="flex items-center justify-between text-sm text-[var(--color-text-muted)] font-sans">
              <span>
                Showing {showingStart}–{showingEnd} of {totalFiltered} customers
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1 rounded-md border border-[var(--color-border)] text-sm font-sans disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--color-surface)] transition-colors"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1 rounded-md border border-[var(--color-border)] text-sm font-sans disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--color-surface)] transition-colors"
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
