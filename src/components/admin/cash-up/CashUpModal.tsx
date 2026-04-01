'use client'

import { useState, useEffect, useCallback } from 'react'
import { openCashSession } from '@/actions/cash-sessions/openCashSession'
import { closeCashSession } from '@/actions/cash-sessions/closeCashSession'
import { DenominationBreakdown } from './DenominationBreakdown'
import { CashVarianceSummary } from './CashVarianceSummary'

interface CashUpModalProps {
  isOpen: boolean
  onClose: () => void
  currentSession: { id: string; opened_at: string; opening_float_cents: number } | null
}

type CloseResult = {
  expectedCashCents: number
  varianceCents: number
  closingCashCents: number
}

export function CashUpModal({ isOpen, onClose, currentSession }: CashUpModalProps) {
  const [floatDollars, setFloatDollars] = useState('')
  const [cashCountedDollars, setCashCountedDollars] = useState('')
  const [cashCountedCents, setCashCountedCents] = useState(0)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [closeResult, setCloseResult] = useState<CloseResult | null>(null)

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, handleEscape])

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFloatDollars('')
      setCashCountedDollars('')
      setCashCountedCents(0)
      setNotes('')
      setError(null)
      setCloseResult(null)
      setLoading(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  async function handleOpenSession() {
    setError(null)
    setLoading(true)
    const openingFloatCents = Math.round(parseFloat(floatDollars || '0') * 100)
    const result = await openCashSession({ openingFloatCents })
    setLoading(false)
    if ('error' in result) {
      setError(result.error)
    } else {
      onClose()
    }
  }

  async function handleCloseSession() {
    if (!currentSession) return
    setError(null)
    setLoading(true)
    // Use denomination-driven cents if denomination has been used, else parse dollars field
    const closingCents =
      cashCountedCents > 0
        ? cashCountedCents
        : Math.round(parseFloat(cashCountedDollars || '0') * 100)
    const result = await closeCashSession({
      sessionId: currentSession.id,
      closingCashCents: closingCents,
      notes: notes || undefined,
    })
    setLoading(false)
    if ('error' in result) {
      setError(result.error)
    } else {
      setCloseResult({
        expectedCashCents: result.expectedCashCents,
        varianceCents: result.varianceCents,
        closingCashCents: closingCents,
      })
    }
  }

  function handleDenominationChange(totalCents: number) {
    setCashCountedCents(totalCents)
    // Also update the dollars field for visual feedback
    setCashCountedDollars((totalCents / 100).toFixed(2))
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center">
      <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 mt-[20vh] shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-sans text-xl font-bold text-[var(--color-text)]">
            {currentSession ? 'Close Cash Session' : 'Open Cash Session'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Content */}
        {closeResult ? (
          // Show variance summary after closing
          <div className="space-y-6">
            <CashVarianceSummary
              expectedCashCents={closeResult.expectedCashCents}
              actualCashCents={closeResult.closingCashCents}
              varianceCents={closeResult.varianceCents}
            />
            <button
              type="button"
              onClick={onClose}
              className="w-full bg-[var(--color-navy)] text-white text-sm font-bold py-2 rounded-md cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : currentSession ? (
          // Close session form
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-[var(--color-text)] mb-1">
                Cash counted
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={cashCountedDollars}
                onChange={(e) => {
                  setCashCountedDollars(e.target.value)
                  setCashCountedCents(0) // Reset denomination total when typing directly
                }}
                placeholder="0.00"
                className="w-full border border-[var(--color-border)] rounded-md px-4 py-2 text-sm font-normal text-[var(--color-text)] focus:outline-none focus:border-[var(--color-navy)]"
              />
            </div>

            <DenominationBreakdown onTotalChange={handleDenominationChange} />

            <div>
              <label className="block text-sm font-bold text-[var(--color-text)] mb-1">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
                rows={2}
                placeholder="Any notes about this cash-up..."
                className="w-full border border-[var(--color-border)] rounded-md px-4 py-2 text-sm font-normal text-[var(--color-text)] focus:outline-none focus:border-[var(--color-navy)] resize-none"
              />
            </div>

            {error && (
              <p className="text-sm font-normal text-[var(--color-error)]">{error}</p>
            )}

            <button
              type="button"
              onClick={handleCloseSession}
              disabled={loading}
              className="w-full bg-[var(--color-amber)] text-white text-sm font-bold py-2 rounded-md cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Closing...' : 'Confirm Close'}
            </button>
          </div>
        ) : (
          // Open session form
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-[var(--color-text)] mb-1">
                Opening float
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={floatDollars}
                onChange={(e) => setFloatDollars(e.target.value)}
                placeholder="0.00"
                className="w-full border border-[var(--color-border)] rounded-md px-4 py-2 text-sm font-normal text-[var(--color-text)] focus:outline-none focus:border-[var(--color-navy)]"
              />
            </div>

            {error && (
              <p className="text-sm font-normal text-[var(--color-error)]">{error}</p>
            )}

            <button
              type="button"
              onClick={handleOpenSession}
              disabled={loading}
              className="w-full bg-[var(--color-navy)] text-white text-sm font-bold py-2 rounded-md cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Opening...' : 'Open Session'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
