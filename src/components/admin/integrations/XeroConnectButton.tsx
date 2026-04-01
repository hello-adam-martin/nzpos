'use client'
import { useState } from 'react'
import type { XeroConnection } from '@/lib/xero/types'
import { disconnectXero } from '@/actions/xero/disconnectXero'

interface XeroConnectButtonProps {
  connection: XeroConnection | null
}

export default function XeroConnectButton({ connection }: XeroConnectButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDisconnect = async () => {
    setIsDisconnecting(true)
    setError(null)
    try {
      const result = await disconnectXero()
      if (!result.success) {
        setError(result.error ?? 'Failed to disconnect Xero')
        setIsDisconnecting(false)
        setShowConfirm(false)
      }
      // On success, revalidation will refresh the page
    } catch {
      setError('An unexpected error occurred. Please try again.')
      setIsDisconnecting(false)
      setShowConfirm(false)
    }
  }

  // State: no connection (null) — show primary Connect button
  if (!connection) {
    return (
      <div className="flex items-center gap-3">
        <a
          href="/api/xero/connect"
          className="inline-flex items-center gap-2 bg-amber text-white font-semibold font-sans px-4 py-2 rounded-[var(--radius-md)] hover:bg-amber-hover transition-colors duration-150 text-sm"
        >
          Connect to Xero
        </a>
      </div>
    )
  }

  // State: disconnected (was connected) — show amber Reconnect button
  if (connection.status === 'disconnected') {
    return (
      <div className="flex items-center gap-3 flex-wrap">
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium font-sans"
          style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}
        >
          Disconnected
        </span>
        <a
          href="/api/xero/connect"
          className="inline-flex items-center gap-2 bg-amber text-white font-semibold font-sans px-4 py-2 rounded-[var(--radius-md)] hover:bg-amber-hover transition-colors duration-150 text-sm"
        >
          Reconnect to Xero
        </a>
      </div>
    )
  }

  // State: token_expired — same as disconnected visually
  if (connection.status === 'token_expired') {
    return (
      <div className="flex items-center gap-3 flex-wrap">
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium font-sans"
          style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}
        >
          Token Expired
        </span>
        <a
          href="/api/xero/connect"
          className="inline-flex items-center gap-2 bg-amber text-white font-semibold font-sans px-4 py-2 rounded-[var(--radius-md)] hover:bg-amber-hover transition-colors duration-150 text-sm"
        >
          Reconnect to Xero
        </a>
      </div>
    )
  }

  // State: connected — show green badge + tenant name + Disconnect button
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium font-sans"
          style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}
        >
          Connected
        </span>
        {connection.tenant_name && (
          <span className="text-sm font-sans text-[var(--color-text-muted)]">
            {connection.tenant_name}
          </span>
        )}
        {!showConfirm && (
          <button
            onClick={() => setShowConfirm(true)}
            className="text-sm font-sans font-semibold hover:opacity-75 transition-opacity duration-150"
            style={{ color: '#DC2626' }}
            type="button"
          >
            Disconnect
          </button>
        )}
      </div>

      {/* Inline disconnect confirmation */}
      {showConfirm && (
        <div
          className="rounded-[var(--radius-md)] p-4 space-y-3"
          style={{ border: '1px solid #DC2626' }}
        >
          <p className="text-sm font-semibold font-sans text-[var(--color-text)]">
            Disconnect Xero?
          </p>
          <p className="text-sm font-sans text-[var(--color-text-muted)]">
            Daily sync will stop. Account codes will be cleared. You can reconnect at any time.
          </p>
          {error && (
            <p className="text-sm font-sans" style={{ color: '#DC2626' }}>
              {error}
            </p>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setShowConfirm(false)
                setError(null)
              }}
              className="text-sm font-sans font-semibold text-[var(--color-navy)] hover:opacity-75 transition-opacity duration-150"
              type="button"
              disabled={isDisconnecting}
            >
              Keep Connected
            </button>
            <button
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="text-sm font-sans font-semibold text-white px-4 py-2 rounded-[var(--radius-md)] transition-opacity duration-150 disabled:opacity-50"
              style={{ backgroundColor: '#DC2626' }}
              type="button"
            >
              {isDisconnecting ? 'Disconnecting...' : 'Disconnect Xero'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
