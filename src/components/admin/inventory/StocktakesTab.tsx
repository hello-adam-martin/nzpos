'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { getStocktakeSessions } from '@/actions/inventory/getStocktakeSessions'
import { createStocktakeSession } from '@/actions/inventory/createStocktakeSession'

type StocktakeSession = {
  id: string
  store_id: string
  scope: string
  category_id: string | null
  status: string
  created_at: string
  created_by: string | null
  committed_at: string | null
  discarded_at: string | null
  updated_at: string | null
  stocktake_lines: { count: number }[]
}

type Category = {
  id: string
  name: string
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'in_progress') {
    return (
      <span className="rounded-full px-2 py-0.5 text-xs font-bold font-body bg-info/10 text-info">
        In progress
      </span>
    )
  }
  if (status === 'completed') {
    return (
      <span className="rounded-full px-2 py-0.5 text-xs font-bold font-body bg-success/10 text-success">
        Committed
      </span>
    )
  }
  return (
    <span className="rounded-full px-2 py-0.5 text-xs font-bold font-body bg-surface text-muted">
      Discarded
    </span>
  )
}

export function StocktakesTab() {
  const router = useRouter()
  const [sessions, setSessions] = useState<StocktakeSession[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [scope, setScope] = useState<'full' | 'category'>('full')
  const [categoryId, setCategoryId] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [isPending, startTransition] = useTransition()
  const [createError, setCreateError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const result = await getStocktakeSessions()
      if ('success' in result && result.success) {
        setSessions(result.sessions as StocktakeSession[])
      }
      setLoading(false)
    }
    void load()
  }, [])

  useEffect(() => {
    if (scope === 'category' && categories.length === 0) {
      // Fetch categories inline
      void fetch('/api/admin/categories')
        .then((r) => r.json())
        .then((data: Category[]) => setCategories(data))
        .catch(() => {
          // If API not available, categories stay empty
        })
    }
  }, [scope, categories.length])

  function handleCreate() {
    setCreateError(null)
    startTransition(async () => {
      const input =
        scope === 'category' && categoryId
          ? { scope: 'category', category_id: categoryId }
          : { scope: 'full' }

      const result = await createStocktakeSession(input)
      if ('error' in result) {
        if (result.error === 'feature_not_active') {
          setCreateError('Inventory add-on is not active. Enable it in your billing settings.')
        } else {
          setCreateError('Failed to create stocktake. Please try again.')
        }
        return
      }
      router.push(`/admin/inventory/stocktake/${result.sessionId}`)
    })
  }

  const lineCount = (session: StocktakeSession) => {
    if (!session.stocktake_lines?.length) return 0
    const first = session.stocktake_lines[0]
    return typeof first === 'object' && 'count' in first ? first.count : 0
  }

  return (
    <div className="space-y-[var(--space-lg)]">
      {/* Header with action */}
      <div className="flex items-center justify-between">
        <div />
        <button
          type="button"
          onClick={() => setShowCreateForm((v) => !v)}
          className="bg-amber text-white font-bold font-body text-sm rounded-md px-4 py-2 hover:opacity-90 transition-opacity cursor-pointer"
        >
          Start stocktake
        </button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div className="bg-card border border-border rounded-md p-[var(--space-md)] space-y-[var(--space-sm)]">
          <h3 className="text-base font-bold font-body text-text">New stocktake</h3>

          <div className="flex gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="scope"
                value="full"
                checked={scope === 'full'}
                onChange={() => setScope('full')}
                className="accent-navy"
              />
              <span className="text-sm font-body text-text">Full inventory</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="scope"
                value="category"
                checked={scope === 'category'}
                onChange={() => setScope('category')}
                className="accent-navy"
              />
              <span className="text-sm font-body text-text">By category</span>
            </label>
          </div>

          {scope === 'category' && (
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="border border-border rounded-md px-[var(--space-md)] py-[var(--space-sm)] text-sm font-body text-text bg-card w-full max-w-xs"
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          )}

          {createError && (
            <p className="text-sm text-error">{createError}</p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreate}
              disabled={isPending || (scope === 'category' && !categoryId)}
              className="bg-navy text-white font-bold font-body text-sm rounded-md px-4 py-2 hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? 'Creating...' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false)
                setCreateError(null)
                setScope('full')
                setCategoryId('')
              }}
              className="text-sm font-body text-muted hover:text-text transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Sessions table or empty state */}
      {loading ? (
        <div className="py-[var(--space-2xl)] text-center text-sm text-muted">
          Loading stocktakes...
        </div>
      ) : sessions.length === 0 ? (
        /* Empty state */
        <div className="py-[var(--space-2xl)] text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-surface mb-3">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-muted"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
          </div>
          <p className="text-base font-bold font-body text-text mb-1">No stocktakes yet</p>
          <p className="text-sm font-body text-muted mb-4">
            Run a stocktake to count your stock on hand and catch any discrepancies.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="bg-amber text-white font-bold font-body text-sm rounded-md px-4 py-2 hover:opacity-90 transition-opacity cursor-pointer"
          >
            Start stocktake
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-navy text-white text-sm font-bold font-body">
                <th className="text-left px-[var(--space-md)] py-[var(--space-sm)]">Started</th>
                <th className="text-left px-[var(--space-md)] py-[var(--space-sm)]">Scope</th>
                <th className="text-left px-[var(--space-md)] py-[var(--space-sm)]">Products</th>
                <th className="text-left px-[var(--space-md)] py-[var(--space-sm)]">Status</th>
                <th className="text-left px-[var(--space-md)] py-[var(--space-sm)]">Action</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session, i) => (
                <tr
                  key={session.id}
                  className={i % 2 === 0 ? 'bg-card' : 'bg-surface'}
                >
                  <td className="px-[var(--space-md)] py-[var(--space-sm)] text-text font-body">
                    {format(new Date(session.created_at), 'dd MMM yyyy HH:mm')}
                  </td>
                  <td className="px-[var(--space-md)] py-[var(--space-sm)] text-text font-body">
                    {session.scope === 'full' ? 'Full inventory' : 'By category'}
                  </td>
                  <td className="px-[var(--space-md)] py-[var(--space-sm)] font-mono text-text">
                    {lineCount(session)}
                  </td>
                  <td className="px-[var(--space-md)] py-[var(--space-sm)]">
                    <StatusBadge status={session.status} />
                  </td>
                  <td className="px-[var(--space-md)] py-[var(--space-sm)]">
                    {session.status === 'in_progress' ? (
                      <a
                        href={`/admin/inventory/stocktake/${session.id}`}
                        className="text-amber hover:underline font-bold font-body text-sm"
                      >
                        Continue
                      </a>
                    ) : (
                      <a
                        href={`/admin/inventory/stocktake/${session.id}`}
                        className="text-muted hover:underline font-body text-sm"
                      >
                        View
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
