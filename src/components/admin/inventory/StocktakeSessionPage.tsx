'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { commitStocktake } from '@/actions/inventory/commitStocktake'
import { discardStocktakeSession } from '@/actions/inventory/discardStocktakeSession'
import { StocktakeCountTab } from './StocktakeCountTab'
import { StocktakeReviewTab } from './StocktakeReviewTab'

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
}

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

interface StocktakeSessionPageProps {
  session: StocktakeSession
  lines: StocktakeLine[]
}

type ActiveTab = 'count' | 'review'

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm font-bold font-body border-b-2 -mb-px transition-colors cursor-pointer ${
        active
          ? 'border-navy text-navy'
          : 'border-transparent text-muted hover:text-primary hover:border-border'
      }`}
    >
      {children}
    </button>
  )
}

export function StocktakeSessionPage({ session, lines }: StocktakeSessionPageProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<ActiveTab>('count')
  const [showCommitStrip, setShowCommitStrip] = useState(false)
  const [showDiscardModal, setShowDiscardModal] = useState(false)
  const [commitError, setCommitError] = useState<string | null>(null)
  const [discardError, setDiscardError] = useState<string | null>(null)
  const [isPendingCommit, startCommitTransition] = useTransition()
  const [isPendingDiscard, startDiscardTransition] = useTransition()

  const discardTriggerRef = useRef<HTMLButtonElement>(null)
  const discardModalFirstFocusRef = useRef<HTMLButtonElement>(null)

  const isInProgress = session.status === 'in_progress'
  const countedLines = lines.filter((l) => l.counted_quantity !== null)
  const hasAnyCount = countedLines.length > 0

  // Focus first button in discard modal when it opens
  useEffect(() => {
    if (showDiscardModal) {
      setTimeout(() => discardModalFirstFocusRef.current?.focus(), 50)
    }
  }, [showDiscardModal])

  // Focus trap for discard modal
  useEffect(() => {
    if (!showDiscardModal) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setShowDiscardModal(false)
        discardTriggerRef.current?.focus()
        return
      }
      if (e.key !== 'Tab') return

      const modal = document.getElementById('discard-modal')
      if (!modal) return
      const focusable = modal.querySelectorAll<HTMLElement>(
        'button, [href], input, [tabindex]:not([tabindex="-1"])'
      )
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!first || !last) return

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showDiscardModal])

  function handleCommitClick() {
    setCommitError(null)
    setShowCommitStrip((prev) => !prev)
  }

  function handleCommitConfirm() {
    setCommitError(null)
    startCommitTransition(async () => {
      const result = await commitStocktake({ session_id: session.id })
      if ('error' in result) {
        setCommitError(
          'Commit failed. No stock quantities were changed. Try again or contact support if this continues.'
        )
        return
      }
      router.push('/admin/inventory?tab=stocktakes')
    })
  }

  function handleDiscardConfirm() {
    setDiscardError(null)
    startDiscardTransition(async () => {
      const result = await discardStocktakeSession({ session_id: session.id })
      if ('error' in result) {
        setDiscardError('Discard failed. Please try again.')
        return
      }
      setShowDiscardModal(false)
      router.push('/admin/inventory?tab=stocktakes')
    })
  }

  const scopeLabel = session.scope === 'full' ? 'Full inventory' : 'By category'
  const sessionDate = format(new Date(session.created_at), 'dd MMM yyyy HH:mm')

  return (
    <div className="space-y-[var(--space-xl)]">
      {/* Back link */}
      <a
        href="/admin/inventory?tab=stocktakes"
        className="inline-flex items-center gap-1 text-sm font-body text-muted hover:text-text transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Stocktakes
      </a>

      {/* Top bar */}
      <div className="flex items-start justify-between gap-[var(--space-md)]">
        <div>
          <h1 className="text-xl font-bold font-display text-primary">
            {scopeLabel} — {sessionDate}
          </h1>
          {!isInProgress && (
            <span
              className={[
                'inline-block mt-1 rounded-full px-2 py-0.5 text-xs font-bold font-body',
                session.status === 'completed'
                  ? 'bg-success/10 text-success'
                  : 'bg-surface text-muted',
              ].join(' ')}
            >
              {session.status === 'completed' ? 'Committed' : 'Discarded'}
            </span>
          )}
        </div>

        {isInProgress && (
          <div className="flex items-center gap-[var(--space-sm)] flex-shrink-0">
            <button
              type="button"
              onClick={handleCommitClick}
              disabled={!hasAnyCount || isPendingCommit}
              className={[
                'bg-amber text-white font-bold font-body text-sm rounded-md px-4 py-2 transition-opacity',
                !hasAnyCount || isPendingCommit
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:opacity-90 cursor-pointer',
              ].join(' ')}
            >
              Commit stocktake
            </button>
            <button
              ref={discardTriggerRef}
              type="button"
              onClick={() => setShowDiscardModal(true)}
              disabled={isPendingDiscard}
              className="text-muted hover:text-error text-sm font-body transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              Discard stocktake
            </button>
          </div>
        )}
      </div>

      {/* Commit confirmation strip */}
      {showCommitStrip && isInProgress && (
        <div
          role="alert"
          className="bg-warning/10 border border-warning rounded-md p-[var(--space-md)] transition-all duration-150 ease-out"
        >
          <p className="text-sm font-body text-text mb-[var(--space-sm)]">
            Commit this stocktake? This will update{' '}
            <strong>{countedLines.length}</strong> product{countedLines.length !== 1 ? 's' : ''}{' '}
            quantities. This cannot be undone.
          </p>
          {commitError && (
            <p className="text-sm font-body text-error mb-[var(--space-sm)]">{commitError}</p>
          )}
          <div className="flex gap-[var(--space-sm)]">
            <button
              type="button"
              onClick={handleCommitConfirm}
              disabled={isPendingCommit}
              className="bg-amber text-white font-bold font-body text-sm rounded-md px-4 py-2 hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPendingCommit ? 'Committing...' : 'Yes, commit'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCommitStrip(false)
                setCommitError(null)
              }}
              className="text-sm font-body text-muted hover:text-text transition-colors cursor-pointer"
            >
              Keep reviewing
            </button>
          </div>
        </div>
      )}

      {/* Tab navigation */}
      <div className="flex gap-2 border-b border-border pb-0">
        <TabButton active={activeTab === 'count'} onClick={() => setActiveTab('count')}>
          Count
        </TabButton>
        <TabButton active={activeTab === 'review'} onClick={() => setActiveTab('review')}>
          Review
        </TabButton>
      </div>

      {/* Tab content */}
      {activeTab === 'count' && (
        <StocktakeCountTab lines={lines} sessionStatus={session.status} />
      )}
      {activeTab === 'review' && <StocktakeReviewTab lines={lines} />}

      {/* Discard modal */}
      {showDiscardModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40"
          role="presentation"
        >
          <div
            id="discard-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="discard-modal-title"
            className="bg-card rounded-lg shadow-lg p-[var(--space-lg)] w-full max-w-sm mx-[var(--space-md)]"
          >
            <h2
              id="discard-modal-title"
              className="text-xl font-bold font-display text-text mb-[var(--space-sm)]"
            >
              Discard stocktake?
            </h2>
            <p className="text-sm font-body text-muted mb-[var(--space-lg)]">
              All counted quantities will be lost. This cannot be undone.
            </p>

            {discardError && (
              <p className="text-sm font-body text-error mb-[var(--space-sm)]">{discardError}</p>
            )}

            <div className="flex gap-[var(--space-sm)]">
              <button
                ref={discardModalFirstFocusRef}
                type="button"
                onClick={handleDiscardConfirm}
                disabled={isPendingDiscard}
                className="bg-error text-white font-bold font-body text-sm rounded-md px-4 py-2 hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPendingDiscard ? 'Discarding...' : 'Discard stocktake'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDiscardModal(false)
                  discardTriggerRef.current?.focus()
                }}
                className="text-sm font-body text-muted hover:text-text transition-colors cursor-pointer"
              >
                Keep counting
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
