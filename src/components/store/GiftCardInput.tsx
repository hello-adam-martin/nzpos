'use client'

import { useState, useTransition } from 'react'
import { validateGiftCard } from '@/actions/gift-cards/validateGiftCard'
import { formatNZD } from '@/lib/money'
import { formatGiftCardCode, normalizeGiftCardCode, computeGiftCardSplit } from '@/lib/gift-card-utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AppliedGiftCard = {
  code: string           // raw 8-digit code
  balanceCents: number
  giftCardAmountCents: number // amount applied (= min(balance, total))
  expiresAt: string
}

interface GiftCardInputProps {
  storeId: string
  totalCents: number       // order total (after promo discount) to compute coverage
  onApply: (card: AppliedGiftCard) => void
  onRemove: () => void
  applied: AppliedGiftCard | null
}

// ---------------------------------------------------------------------------
// Error message map (matches POS copy per UI-SPEC)
// ---------------------------------------------------------------------------

const ERROR_MESSAGES: Record<string, string> = {
  GIFT_CARD_NOT_FOUND: 'Gift card not found. Please check the code and try again.',
  GIFT_CARD_EXPIRED: 'This gift card has expired and cannot be used.',
  GIFT_CARD_VOIDED: 'This gift card has been voided and cannot be used.',
  GIFT_CARD_ZERO_BALANCE: 'This gift card has a $0.00 balance and cannot be used.',
  server_error: 'Something went wrong. Please try again.',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Collapsible gift card code entry section for the storefront cart drawer.
 *
 * - Collapsed by default: "Have a gift card? Enter code" link
 * - Expanded: XXXX-XXXX code input + "Apply Gift Card" button
 * - Applied: green check, discount amount, "Remove" link
 * - Full cover: signals to parent to hide Stripe section (via onApply)
 * - Partial cover: signals to parent to adjust Stripe amount
 *
 * Per UI-SPEC section 8, D-11, D-12.
 */
export function GiftCardInput({ storeId, totalCents, onApply, onRemove, applied }: GiftCardInputProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [rawInput, setRawInput] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // ---------------------------------------------------------------------------
  // Applied state — show success UI
  // ---------------------------------------------------------------------------

  if (applied) {
    const isFullCover = applied.giftCardAmountCents >= totalCents

    return (
      <div className="py-3">
        {/* Applied success row */}
        <div className="flex items-start justify-between gap-2 px-3 py-2 rounded-md bg-[var(--color-success)]/10 border border-[var(--color-success)]/30">
          <div className="flex items-start gap-2">
            {/* CheckCircle icon (lucide) */}
            <svg
              className="w-4 h-4 text-[var(--color-success)] shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-[var(--color-success)]">
                Gift card applied — {formatNZD(applied.giftCardAmountCents)} off
              </p>
              {!isFullCover && (
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  Remaining to pay via Stripe: {formatNZD(totalCents - applied.giftCardAmountCents)}
                </p>
              )}
              {isFullCover && (
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  Gift card covers the full order — no payment needed
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-[var(--color-text-muted)] underline hover:text-[var(--color-text)] transition-colors shrink-0"
          >
            Remove
          </button>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Format input as XXXX-XXXX while storing raw digits
  // ---------------------------------------------------------------------------

  function handleCodeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = normalizeGiftCardCode(e.target.value).slice(0, 8)
    setRawInput(raw)
    setErrorMessage(null)
  }

  const displayValue = rawInput.length > 4
    ? `${rawInput.slice(0, 4)}-${rawInput.slice(4)}`
    : rawInput

  // ---------------------------------------------------------------------------
  // Apply gift card
  // ---------------------------------------------------------------------------

  function handleApply() {
    if (rawInput.length !== 8) return
    setErrorMessage(null)

    startTransition(async () => {
      const result = await validateGiftCard({ storeId, code: rawInput })

      if (!result.valid) {
        setErrorMessage(ERROR_MESSAGES[result.error] ?? ERROR_MESSAGES.server_error)
        return
      }

      const { giftCardAmount } = computeGiftCardSplit(result.balanceCents, totalCents)

      onApply({
        code: rawInput,
        balanceCents: result.balanceCents,
        giftCardAmountCents: giftCardAmount,
        expiresAt: result.expiresAt,
      })

      // Reset input (applied state takes over UI)
      setRawInput('')
      setIsExpanded(false)
    })
  }

  // ---------------------------------------------------------------------------
  // Collapsed state
  // ---------------------------------------------------------------------------

  if (!isExpanded) {
    return (
      <div
        className="py-3"
        style={{
          overflow: 'hidden',
          transition: 'max-height 150ms ease-out, opacity 150ms ease-out',
        }}
      >
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="text-sm text-[var(--color-navy)] underline-offset-2 hover:underline transition-colors"
        >
          Have a gift card? Enter code
        </button>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Expanded state
  // ---------------------------------------------------------------------------

  return (
    <div
      className="py-3 space-y-2"
      style={{
        overflow: 'hidden',
        transition: 'max-height 150ms ease-out, opacity 150ms ease-out',
      }}
    >
      <label
        htmlFor="gc-code-input"
        className="block text-sm font-semibold text-[var(--color-text)]"
      >
        Gift card code
      </label>

      <div className="flex gap-2">
        <input
          id="gc-code-input"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={displayValue}
          onChange={handleCodeChange}
          onKeyDown={(e) => { if (e.key === 'Enter') handleApply() }}
          placeholder="XXXX-XXXX"
          disabled={isPending}
          maxLength={9} // 8 digits + 1 dash
          className="flex-1 px-3 py-2 text-sm font-mono border border-[var(--color-border)] rounded-md bg-[var(--color-card)] text-[var(--color-text)] placeholder:text-[var(--color-text-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)] disabled:opacity-50 transition-shadow"
        />
        <button
          type="button"
          onClick={handleApply}
          disabled={isPending || rawInput.length !== 8}
          className="px-4 py-2 text-sm font-semibold bg-[var(--color-navy)] text-white rounded-md hover:bg-[var(--color-navy-light)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 shrink-0"
        >
          {isPending ? (
            <span className="flex items-center gap-1.5">
              <svg
                className="w-3.5 h-3.5 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Checking…
            </span>
          ) : (
            'Apply Gift Card'
          )}
        </button>
      </div>

      {/* Error message */}
      <div aria-live="polite" className="min-h-[1.25rem]">
        {errorMessage && (
          <p className="text-xs text-[var(--color-error)]">{errorMessage}</p>
        )}
      </div>

      {/* Cancel link */}
      <button
        type="button"
        onClick={() => {
          setIsExpanded(false)
          setRawInput('')
          setErrorMessage(null)
        }}
        className="text-xs text-[var(--color-text-muted)] underline-offset-2 hover:underline transition-colors"
      >
        Cancel
      </button>
    </div>
  )
}
