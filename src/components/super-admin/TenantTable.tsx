'use client'
import { useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import TenantStatusBadge from './TenantStatusBadge'

interface Store {
  id: string
  name: string
  slug: string
  is_active: boolean
  created_at: string
  plan_summary: string
}

interface TenantTableProps {
  stores: Store[]
  totalCount: number
  page: number
  pageSize: number
  query: string
  status: string
}

function buildUrl(
  current: URLSearchParams,
  updates: Record<string, string | null>
): string {
  const params = new URLSearchParams(current.toString())
  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === '') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
  }
  return '/super-admin/tenants?' + params.toString()
}

export default function TenantTable({
  stores,
  totalCount,
  page,
  pageSize,
  query,
  status,
}: TenantTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Set input value on mount if query param exists
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.value = query
    }
  }, [query])

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalCount)

  function handleSearchChange(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      router.push(buildUrl(searchParams, { q: value || null, page: null }))
    }, 300)
  }

  function handleClearSearch() {
    if (inputRef.current) inputRef.current.value = ''
    if (debounceRef.current) clearTimeout(debounceRef.current)
    router.push(buildUrl(searchParams, { q: null, page: null }))
  }

  function handleStatusChange(value: string) {
    router.push(buildUrl(searchParams, { status: value || null, page: null }))
  }

  function getPageNumbers(): (number | '...')[] {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    const pages: (number | '...')[] = []
    if (page <= 3) {
      pages.push(1, 2, 3, 4, 5, '...')
    } else if (page >= totalPages - 2) {
      pages.push('...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
    } else {
      pages.push('...', page - 1, page, page + 1, '...')
    }
    return pages
  }

  return (
    <div>
      {/* Controls row */}
      <div className="flex items-center gap-4 mb-6">
        {/* Search input */}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            defaultValue={query}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search name or slug..."
            className="w-[280px] text-sm font-sans border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)] pr-8"
          />
          {query && (
            <button
              type="button"
              onClick={handleClearSearch}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-lg leading-none"
            >
              &times;
            </button>
          )}
        </div>

        {/* Status filter */}
        <select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="text-sm font-sans border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]"
        >
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>

        {/* Results count — right-aligned */}
        <span className="ml-auto text-sm text-[var(--color-text-muted)] font-sans">
          {totalCount} {totalCount === 1 ? 'store' : 'stores'}
        </span>
      </div>

      {/* Table */}
      <table className="w-full border-t border-b border-[var(--color-border)]">
        <thead>
          <tr className="border-b border-[var(--color-border)]">
            <th className="text-left text-sm font-semibold font-sans text-[var(--color-text-muted)] py-3 px-3">Store Name</th>
            <th className="text-left text-sm font-semibold font-sans text-[var(--color-text-muted)] py-3 px-3">Slug</th>
            <th className="text-left text-sm font-semibold font-sans text-[var(--color-text-muted)] py-3 px-3">Status</th>
            <th className="text-left text-sm font-semibold font-sans text-[var(--color-text-muted)] py-3 px-3">Add-ons</th>
            <th className="text-left text-sm font-semibold font-sans text-[var(--color-text-muted)] py-3 px-3">Created</th>
            <th className="text-left text-sm font-semibold font-sans text-[var(--color-text-muted)] py-3 px-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {stores.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-12 text-center text-[var(--color-text-muted)] font-sans text-base">
                {query || status ? 'No stores match your search. Try a different name or slug.' : 'No stores yet.'}
                {!query && !status && (
                  <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                    Stores will appear here once merchants sign up.
                  </p>
                )}
              </td>
            </tr>
          ) : (
            stores.map((store) => (
              <tr
                key={store.id}
                onClick={() => router.push(`/super-admin/tenants/${store.id}`)}
                className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface)] cursor-pointer transition-colors duration-100 min-h-[48px]"
              >
                <td className="py-3 px-3 text-base font-sans text-[var(--color-text)]">{store.name}</td>
                <td className="py-3 px-3 font-mono text-sm text-[var(--color-text-muted)]">{store.slug}</td>
                <td className="py-3 px-3">
                  <TenantStatusBadge isActive={store.is_active} />
                </td>
                <td className="py-3 px-3 text-base font-sans text-[var(--color-text-muted)]">{store.plan_summary}</td>
                <td className="py-3 px-3 text-base font-sans text-[var(--color-text-muted)]">
                  {format(new Date(store.created_at), 'd MMM yyyy')}
                </td>
                <td className="py-3 px-3">
                  <Link
                    href={`/super-admin/tenants/${store.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-sm font-sans text-[var(--color-navy)] hover:underline"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-6">
        <span className="text-sm font-sans text-[var(--color-text-muted)]">
          {totalCount === 0
            ? 'No stores'
            : `Showing ${from}\u2013${to} of ${totalCount} stores`}
        </span>
        <div className="flex items-center gap-1">
          {/* Previous */}
          {page <= 1 ? (
            <span className="px-3 py-1 text-sm font-sans text-[var(--color-text-muted)] cursor-not-allowed">
              Previous
            </span>
          ) : (
            <Link
              href={buildUrl(searchParams, { page: String(page - 1) })}
              className="px-3 py-1 text-sm font-sans text-[var(--color-navy)] hover:underline"
            >
              Previous
            </Link>
          )}

          {/* Page numbers */}
          {getPageNumbers().map((p, i) =>
            p === '...' ? (
              <span key={`ellipsis-${i}`} className="px-2 py-1 text-sm font-sans text-[var(--color-text-muted)]">
                &hellip;
              </span>
            ) : (
              <Link
                key={p}
                href={buildUrl(searchParams, { page: String(p) })}
                className={[
                  'px-3 py-1 text-sm font-sans rounded-[var(--radius-sm)]',
                  p === page
                    ? 'bg-[var(--color-navy)] text-white'
                    : 'text-[var(--color-navy)] hover:underline',
                ].join(' ')}
              >
                {p}
              </Link>
            )
          )}

          {/* Next */}
          {page >= totalPages ? (
            <span className="px-3 py-1 text-sm font-sans text-[var(--color-text-muted)] cursor-not-allowed">
              Next
            </span>
          ) : (
            <Link
              href={buildUrl(searchParams, { page: String(page + 1) })}
              className="px-3 py-1 text-sm font-sans text-[var(--color-navy)] hover:underline"
            >
              Next
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
