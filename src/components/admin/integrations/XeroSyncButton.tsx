'use client'
import { useState } from 'react'
import { triggerManualSync } from '@/actions/xero/triggerManualSync'

interface Props {
  isConnected: boolean
}

export default function XeroSyncButton({ isConnected }: Props) {
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  if (!isConnected) {
    return null
  }

  async function handleSync() {
    setLoading(true)
    setFeedback(null)
    try {
      const result = await triggerManualSync()
      if (result.success) {
        const msg = result.invoiceNumber
          ? `Synced — Invoice #${result.invoiceNumber} created in Xero.`
          : result.message || 'Sync complete.'
        setFeedback({ type: 'success', message: msg })
        // Auto-clear success message after 5 seconds
        setTimeout(() => setFeedback(null), 5000)
      } else {
        const msg = result.message
          ? `${result.message}. Check the log below for details.`
          : 'Sync failed. Check the log below for details.'
        setFeedback({ type: 'error', message: msg })
      }
    } catch {
      setFeedback({ type: 'error', message: 'An unexpected error occurred. Check the log below for details.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleSync}
        disabled={loading}
        className="inline-flex items-center gap-2 bg-amber text-white font-semibold font-sans px-4 py-2 rounded-[var(--radius-md)] text-sm disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
      >
        {loading && (
          <svg
            className="w-4 h-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {loading ? 'Syncing...' : 'Sync Today\'s Sales'}
      </button>

      {feedback && (
        <p
          className="text-sm font-sans"
          style={{ color: feedback.type === 'success' ? '#065F46' : '#DC2626' }}
        >
          {feedback.message}
        </p>
      )}
    </div>
  )
}
