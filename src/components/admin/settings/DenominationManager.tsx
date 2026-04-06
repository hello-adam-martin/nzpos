'use client'
import { useState, useTransition } from 'react'
import { updateGiftCardDenominations } from '@/actions/settings/updateGiftCardDenominations'

interface DenominationManagerProps {
  /** Current denominations in cents, e.g. [2500, 5000, 10000] */
  denominations: number[]
  storeId: string
}

/**
 * Client component for managing gift card denominations.
 * Denominations are stored as integer cents. UI converts to/from dollars.
 * Min: $5 (500 cents). Max: $500 (50000 cents).
 */
export function DenominationManager({ denominations: initial, storeId }: DenominationManagerProps) {
  const [denominations, setDenominations] = useState<number[]>(initial)
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleRemove(cents: number) {
    const updated = denominations.filter((d) => d !== cents)
    setDenominations(updated)
    setSuccess(false)
    startTransition(async () => {
      await updateGiftCardDenominations(storeId, updated)
      setSuccess(true)
    })
  }

  function handleAdd() {
    setError(null)
    const dollars = parseFloat(inputValue)
    if (isNaN(dollars) || !isFinite(dollars)) {
      setError('Enter a valid dollar amount.')
      return
    }
    const cents = Math.round(dollars * 100)
    if (cents < 500) {
      setError('Minimum denomination is $5.00.')
      return
    }
    if (cents > 50000) {
      setError('Maximum denomination is $500.00.')
      return
    }
    if (denominations.includes(cents)) {
      setError('This denomination already exists.')
      return
    }

    const updated = [...denominations, cents].sort((a, b) => a - b)
    setDenominations(updated)
    setInputValue('')
    setSuccess(false)
    startTransition(async () => {
      await updateGiftCardDenominations(storeId, updated)
      setSuccess(true)
    })
  }

  function formatDollars(cents: number): string {
    return `$${(cents / 100).toFixed(2).replace(/\.00$/, '')}`
  }

  return (
    <div className="space-y-4">
      {denominations.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)] font-sans">
          No denominations set. Add at least one so customers can purchase gift cards.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {denominations.map((cents) => (
            <span
              key={cents}
              className="inline-flex items-center gap-1.5 border border-[var(--color-border)] rounded-full px-3 py-1 text-sm font-semibold font-sans text-[var(--color-text)]"
            >
              {formatDollars(cents)}
              <button
                type="button"
                onClick={() => handleRemove(cents)}
                disabled={isPending}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors disabled:opacity-50"
                aria-label={`Remove ${formatDollars(cents)} denomination`}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M3 3l8 8M11 3l-8 8" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Add denomination input */}
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-text-muted)] font-sans pointer-events-none">
              $
            </span>
            <input
              type="number"
              min="5"
              max="500"
              step="5"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value)
                setError(null)
                setSuccess(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAdd()
                }
              }}
              placeholder="25"
              className="w-full pl-7 pr-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-md)] text-sm font-sans text-[var(--color-text)] bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)] placeholder:text-[var(--color-text-light)]"
              aria-label="Denomination amount in dollars"
            />
          </div>
          {error && (
            <p className="mt-1 text-xs text-red-600 font-sans">{error}</p>
          )}
          {success && !error && (
            <p className="mt-1 text-xs text-green-600 font-sans">Saved.</p>
          )}
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={isPending || !inputValue}
          className="px-4 py-2 bg-[var(--color-navy)] text-white text-sm font-semibold font-sans rounded-[var(--radius-md)] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {isPending ? 'Saving…' : 'Add'}
        </button>
      </div>
    </div>
  )
}
