'use client'

import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { triggerStripeSync } from '@/actions/super-admin/triggerStripeSync'

interface AnalyticsSyncControlsProps {
  lastSyncedAt: string | null
  onSyncComplete: () => void
}

type SyncStatus = 'idle' | 'loading' | 'success' | 'error'

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function computeRetrySeconds(lastSyncedAt: string | null): number | null {
  if (!lastSyncedAt) return null
  const RATE_LIMIT_MS = 5 * 60 * 1000
  const elapsed = Date.now() - new Date(lastSyncedAt).getTime()
  const remaining = Math.ceil((RATE_LIMIT_MS - elapsed) / 1000)
  return remaining > 0 ? remaining : null
}

export default function AnalyticsSyncControls({
  lastSyncedAt,
  onSyncComplete,
}: AnalyticsSyncControlsProps) {
  const [status, setStatus] = useState<SyncStatus>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [retrySeconds, setRetrySeconds] = useState<number | null>(() =>
    computeRetrySeconds(lastSyncedAt)
  )

  // Countdown timer
  useEffect(() => {
    if (retrySeconds === null || retrySeconds <= 0) return
    const interval = setInterval(() => {
      setRetrySeconds(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval)
          return null
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [retrySeconds])

  async function handleRefresh() {
    if (status === 'loading' || retrySeconds !== null) return
    setStatus('loading')
    setErrorMsg(null)

    const result = await triggerStripeSync()

    if ('success' in result && result.success) {
      setStatus('success')
      setRetrySeconds(computeRetrySeconds(result.syncedAt))
      onSyncComplete()
      // Auto-dismiss success banner after 4 seconds
      setTimeout(() => {
        setStatus('idle')
      }, 4000)
    } else if ('error' in result) {
      if (result.retryAfter) {
        const remaining = Math.ceil(
          (new Date(result.retryAfter).getTime() - Date.now()) / 1000
        )
        setRetrySeconds(remaining > 0 ? remaining : null)
      }
      setErrorMsg(
        result.error === 'Rate limited'
          ? 'Sync unavailable — try again shortly.'
          : 'Sync failed. Check your connection and try again.'
      )
      setStatus('error')
    }
  }

  const isDisabled = status === 'loading' || retrySeconds !== null

  const lastSyncedText = lastSyncedAt
    ? `Last synced: ${formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true })}`
    : 'Never synced'

  return (
    <div className="flex flex-col items-end gap-[var(--space-sm)]">
      <div className="flex flex-row items-center gap-[var(--space-sm)]">
        <span className="text-sm font-sans text-[var(--color-text-muted)]">{lastSyncedText}</span>

        <button
          onClick={handleRefresh}
          disabled={isDisabled}
          aria-busy={status === 'loading' ? 'true' : 'false'}
          aria-disabled={isDisabled ? 'true' : 'false'}
          className={
            status === 'loading'
              ? 'inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-sans font-semibold text-white bg-[var(--color-amber)] opacity-60 transition-opacity'
              : retrySeconds !== null
                ? 'inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-sans font-semibold text-gray-500 bg-gray-300 opacity-50 cursor-not-allowed'
                : 'inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-sans font-semibold text-white bg-[var(--color-amber)] hover:bg-[var(--color-amber-hover)] transition-colors'
          }
        >
          {status === 'loading' ? (
            <>
              <svg
                className="animate-spin"
                aria-hidden="true"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
              >
                <circle
                  cx="8"
                  cy="8"
                  r="6"
                  stroke="white"
                  strokeWidth="2"
                  strokeOpacity="0.3"
                />
                <path
                  d="M8 2a6 6 0 0 1 6 6"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              Syncing...
            </>
          ) : retrySeconds !== null ? (
            `Available in ${formatCountdown(retrySeconds)}`
          ) : (
            'Refresh Data'
          )}
        </button>
      </div>

      {status === 'success' && (
        <div
          role="status"
          className="bg-[var(--color-success)] bg-opacity-10 border border-[var(--color-success)] rounded-md px-4 py-2 text-sm text-[var(--color-success)]"
        >
          Data refreshed successfully.
        </div>
      )}

      {status === 'error' && errorMsg && (
        <div role="alert" className="text-sm text-[var(--color-error)]">
          {errorMsg}
        </div>
      )}
    </div>
  )
}
