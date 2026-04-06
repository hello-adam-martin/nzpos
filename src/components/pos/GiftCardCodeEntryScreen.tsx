'use client'

import { useState, useEffect, useRef } from 'react'
import { validateGiftCard, type ValidateGiftCardResult } from '@/actions/gift-cards/validateGiftCard'
import { formatNZD } from '@/lib/money'
import { format } from 'date-fns'

type GiftCardCodeEntryScreenProps = {
  storeId: string
  totalCents: number
  onValidated: (data: {
    balanceCents: number
    expiresAt: string
    giftCardAmountCents: number
    splitRemainderMethod?: 'eftpos' | 'cash'
  }) => void
  onCancel: () => void
}

export function GiftCardCodeEntryScreen({
  storeId,
  totalCents,
  onValidated,
  onCancel,
}: GiftCardCodeEntryScreenProps) {
  const [rawDigits, setRawDigits] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationResult, setValidationResult] = useState<(ValidateGiftCardResult & { valid: true }) | null>(null)
  const [splitMethod, setSplitMethod] = useState<'eftpos' | 'cash' | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Format raw digits as XXXX-XXXX for display
  const displayValue = rawDigits.length > 4
    ? rawDigits.slice(0, 4) + '-' + rawDigits.slice(4, 8)
    : rawDigits

  const isComplete = rawDigits.length === 8

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Extract only digits from input
    const digits = e.target.value.replace(/\D/g, '').slice(0, 8)
    setRawDigits(digits)
    setError(null)
    setValidationResult(null)
    setSplitMethod(null)
  }

  async function handleLookUp() {
    if (!isComplete || isLoading) return
    setIsLoading(true)
    setError(null)

    const result = await validateGiftCard({ storeId, code: rawDigits })

    setIsLoading(false)

    if (!result.valid) {
      switch (result.error) {
        case 'GIFT_CARD_NOT_FOUND':
          setError('Code not found. Check the number and try again.')
          break
        case 'GIFT_CARD_EXPIRED':
          setError(`This gift card has expired and cannot be used.`)
          break
        case 'GIFT_CARD_VOIDED':
          setError('This gift card has been voided and cannot be used.')
          break
        case 'GIFT_CARD_ZERO_BALANCE':
          setError('This gift card has a $0.00 balance and cannot be used.')
          break
        default:
          setError('Code not found. Check the number and try again.')
      }
      return
    }

    setValidationResult(result)

    const giftCardAmountCents = Math.min(result.balanceCents, totalCents)
    const isFullCover = giftCardAmountCents >= totalCents

    // Full cover — auto-confirm, no split needed
    if (isFullCover) {
      onValidated({
        balanceCents: result.balanceCents,
        expiresAt: result.expiresAt,
        giftCardAmountCents,
      })
    }
    // Partial cover — show split remainder buttons before confirming
  }

  function handleConfirmWithSplit(method: 'eftpos' | 'cash') {
    if (!validationResult) return
    setSplitMethod(method)
    const giftCardAmountCents = Math.min(validationResult.balanceCents, totalCents)
    onValidated({
      balanceCents: validationResult.balanceCents,
      expiresAt: validationResult.expiresAt,
      giftCardAmountCents,
      splitRemainderMethod: method,
    })
  }

  const isPartialCover = validationResult !== null
    && Math.min(validationResult.balanceCents, totalCents) < totalCents

  const appliedAmount = validationResult
    ? Math.min(validationResult.balanceCents, totalCents)
    : null

  const remainderAmount = validationResult
    ? totalCents - Math.min(validationResult.balanceCents, totalCents)
    : null

  const expiryDisplay = validationResult
    ? format(new Date(validationResult.expiresAt), 'd MMMM yyyy')
    : null

  return (
    <div
      className="fixed inset-0 z-50 bg-card flex flex-col items-center justify-center px-4 animate-[fadeIn_150ms_ease-out]"
      role="dialog"
      aria-modal="true"
      aria-label="Gift card code entry"
    >
      <div className="w-full max-w-sm">
        {/* Label */}
        <p className="text-sm text-text-muted text-center mb-3">
          Enter gift card code
        </p>

        {/* Code input */}
        <div className="mb-4">
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            aria-label="Gift card code"
            autoComplete="off"
            value={displayValue}
            onChange={handleInputChange}
            placeholder="0000-0000"
            className={[
              'w-full py-3 px-4 font-mono text-[30px] font-bold text-center border-2 rounded-lg min-h-[48px] bg-bg transition-colors focus:outline-none',
              error ? 'border-error' : 'border-border focus:border-navy',
            ].join(' ')}
          />
        </div>

        {/* Error message */}
        {error && (
          <p className="text-sm text-error text-center mb-4" role="alert">
            {error}
          </p>
        )}

        {/* Validation result — balance and applied amount */}
        {validationResult && !error && (
          <div className="mb-4 text-center space-y-1">
            <p className="text-base text-text">
              Balance: {formatNZD(validationResult.balanceCents)} · Expires {expiryDisplay}
            </p>
            {appliedAmount !== null && (
              <p className="text-sm text-success font-semibold">
                Applying {formatNZD(appliedAmount)} to this sale
              </p>
            )}
            {isPartialCover && remainderAmount !== null && remainderAmount > 0 && (
              <p className="text-sm text-text-muted">
                Remaining {formatNZD(remainderAmount)} due via EFTPOS or Cash
              </p>
            )}
          </div>
        )}

        {/* Split remainder method selection (partial cover only) */}
        {isPartialCover && (
          <div className="mb-4">
            <p className="text-sm text-text-muted text-center mb-2">Pay remainder with:</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleConfirmWithSplit('eftpos')}
                disabled={splitMethod !== null}
                aria-pressed={splitMethod === 'eftpos'}
                className={[
                  'flex-1 min-h-[44px] rounded-full text-sm font-bold text-center transition-colors',
                  splitMethod === 'eftpos'
                    ? 'bg-navy text-white'
                    : 'bg-card text-navy border border-border hover:bg-surface',
                ].join(' ')}
              >
                EFTPOS
              </button>
              <button
                type="button"
                onClick={() => handleConfirmWithSplit('cash')}
                disabled={splitMethod !== null}
                aria-pressed={splitMethod === 'cash'}
                className={[
                  'flex-1 min-h-[44px] rounded-full text-sm font-bold text-center transition-colors',
                  splitMethod === 'cash'
                    ? 'bg-navy text-white'
                    : 'bg-card text-navy border border-border hover:bg-surface',
                ].join(' ')}
              >
                Cash
              </button>
            </div>
          </div>
        )}

        {/* Look Up Balance button (shown when no valid result yet) */}
        {!validationResult && (
          <button
            type="button"
            onClick={handleLookUp}
            disabled={!isComplete || isLoading}
            className={[
              'w-full min-h-[48px] bg-navy text-white text-base font-bold rounded-lg mb-3 transition-opacity',
              !isComplete || isLoading ? 'opacity-50 pointer-events-none' : 'hover:opacity-90',
            ].join(' ')}
          >
            {isLoading ? 'Checking…' : 'Look Up Balance'}
          </button>
        )}

        {/* Cancel button */}
        <button
          type="button"
          onClick={onCancel}
          className="w-full min-h-[44px] border border-border text-navy text-base font-bold rounded-lg hover:bg-surface transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
