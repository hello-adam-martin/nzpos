'use client'

import { useState, useEffect, useRef } from 'react'
import { calcChangeDue } from '@/lib/cart'
import { formatNZD, parsePriceToCents } from '@/lib/money'

type CashEntryScreenProps = {
  totalCents: number
  onComplete: (cashTenderedCents: number) => void
  onSplit: (cashAmountCents: number) => void
  onCancel: () => void
}

export function CashEntryScreen({ totalCents, onComplete, onSplit, onCancel }: CashEntryScreenProps) {
  const [amountStr, setAmountStr] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Cap at $99,999 (9,999,900 cents) to prevent unreasonable inputs
  const MAX_CASH_CENTS = 9_999_900
  const rawCents = parsePriceToCents(amountStr) ?? 0
  const tenderedCents = Math.min(rawCents, MAX_CASH_CENTS)
  const hasAmount = tenderedCents > 0
  const isExact = tenderedCents === totalCents
  const isSufficient = tenderedCents >= totalCents
  const isPartial = hasAmount && tenderedCents < totalCents
  const changeCents = isSufficient ? calcChangeDue(totalCents, tenderedCents) : 0

  return (
    <div
      className="fixed inset-0 z-50 bg-card flex flex-col items-center justify-center px-4 animate-[fadeIn_150ms_ease-out]"
      role="dialog"
      aria-modal="true"
      aria-label="Cash payment entry"
    >
      <div className="w-full max-w-md">
        {/* Total */}
        <div className="text-center mb-6">
          <p className="text-sm text-text-muted font-normal">Total to pay</p>
          <p className="text-3xl font-display font-bold text-text tabular-nums">
            {formatNZD(totalCents)}
          </p>
        </div>

        {/* Cash tendered input */}
        <div className="mb-4">
          <label className="block text-sm text-text-muted mb-1 text-center">
            Cash tendered
          </label>
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            placeholder="$0.00"
            className="text-3xl font-display font-bold text-center w-full py-4 px-3 border border-border rounded-lg bg-bg focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/20"
          />
        </div>

        {/* Change due / insufficient */}
        <div className="h-8 flex items-center justify-center mb-6">
          {isSufficient && hasAmount && (
            <div className="text-center">
              <span className="text-sm text-text-muted">Change due: </span>
              <span className="text-base font-bold text-success tabular-nums">
                {formatNZD(changeCents)}
              </span>
              {isExact && (
                <span className="text-sm text-text-muted ml-2">(exact)</span>
              )}
            </div>
          )}
          {isPartial && (
            <p className="text-base font-bold text-error text-center">
              Insufficient — {formatNZD(totalCents - tenderedCents)} short
            </p>
          )}
        </div>

        {/* Complete sale */}
        <button
          onClick={() => isSufficient && onComplete(tenderedCents)}
          disabled={!isSufficient}
          className={[
            'w-full min-h-[56px] bg-success text-white text-base font-bold rounded-lg mb-3 transition-opacity',
            !isSufficient ? 'opacity-50 pointer-events-none' : 'hover:opacity-90',
          ].join(' ')}
        >
          Complete Sale
        </button>

        {/* Split payment */}
        {isPartial && (
          <button
            onClick={() => onSplit(tenderedCents)}
            className="w-full min-h-[44px] bg-navy text-white text-base font-bold rounded-lg mb-3 hover:opacity-90 transition-opacity px-3"
          >
            Pay {formatNZD(tenderedCents)} cash, {formatNZD(totalCents - tenderedCents)} EFTPOS
          </button>
        )}

        {/* Cancel */}
        <button
          onClick={onCancel}
          className="w-full min-h-[44px] border border-border text-navy text-base font-bold rounded-lg hover:bg-surface transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
