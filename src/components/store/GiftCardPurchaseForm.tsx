'use client'

import { useState, useTransition } from 'react'
import { formatNZD } from '@/lib/money'
import { purchaseGiftCardOnline } from '@/actions/gift-cards/purchaseGiftCardOnline'

type Props = {
  storeId: string
  denominations: number[]
  purchaseSuccess?: boolean
}

/**
 * Storefront gift cards purchase form (D-09, D-10, UI-SPEC section 7).
 *
 * - Denomination pill selection (role="radiogroup" / role="radio")
 * - Buyer email field
 * - "Buy Gift Card — $X.XX" CTA (disabled until denomination + valid email)
 * - Inline success message after purchase (no redirect — ?success=true from webhook redirect)
 */
export function GiftCardPurchaseForm({ storeId, denominations, purchaseSuccess }: Props) {
  const [selectedDenomination, setSelectedDenomination] = useState<number | null>(null)
  const [buyerEmail, setBuyerEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Basic email validation
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)
  const canSubmit = selectedDenomination !== null && emailValid && !isPending

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || selectedDenomination === null) return

    setError(null)
    startTransition(async () => {
      const result = await purchaseGiftCardOnline({
        storeId,
        denominationCents: selectedDenomination,
        buyerEmail,
      })

      if ('error' in result) {
        setError(result.error)
        return
      }

      // Redirect to Stripe Checkout
      window.location.href = result.url
    })
  }

  return (
    <div className="mx-auto max-w-[480px] px-4">
      {/* Page heading */}
      <h1
        className="font-display text-[30px] font-bold text-navy mb-8"
      >
        Gift Cards
      </h1>

      {/* Success message after purchase redirect */}
      {purchaseSuccess && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-[#059669]/30 bg-[#ECFDF5] p-4">
          {/* Green check SVG */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-5 w-5 shrink-0 text-[#059669] mt-0.5"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-sm text-[#059669] font-medium">
            Gift card purchased! Check your email for the code.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Denomination selection */}
        <fieldset className="mb-6">
          <legend className="text-sm font-semibold text-navy mb-3">
            Select amount
          </legend>
          <div
            role="radiogroup"
            aria-label="Gift card denomination"
            className="flex flex-wrap gap-2"
          >
            {denominations.map((cents) => (
              <button
                key={cents}
                type="button"
                role="radio"
                aria-checked={selectedDenomination === cents}
                onClick={() => setSelectedDenomination(cents)}
                className={[
                  'border rounded-full h-[40px] px-8 text-base font-semibold cursor-pointer transition-colors duration-100',
                  selectedDenomination === cents
                    ? 'border-amber bg-amber/10 text-amber'
                    : 'border-border text-text hover:border-navy',
                ].join(' ')}
              >
                {formatNZD(cents)}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Helper text */}
        <p className="text-sm text-text-light mb-6">
          {"You'll receive the gift card code by email to share with someone special."}
        </p>

        {/* Buyer email */}
        <div className="mb-6">
          <label
            htmlFor="buyer-email"
            className="block text-sm font-semibold text-navy mb-1.5"
          >
            Your email address
          </label>
          <input
            id="buyer-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={buyerEmail}
            onChange={(e) => setBuyerEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full h-10 px-3 rounded-md border border-border bg-card text-sm text-text placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 transition-colors duration-150"
          />
        </div>

        {/* Error message */}
        {error && (
          <p className="text-sm text-error mb-4" role="alert">
            {error}
          </p>
        )}

        {/* CTA button */}
        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full min-h-[48px] rounded-md bg-amber font-display text-base font-bold text-white transition-opacity duration-150 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              {/* Spinner */}
              <svg
                className="h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
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
                  d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Processing...
            </>
          ) : selectedDenomination !== null ? (
            `Buy Gift Card \u2014 ${formatNZD(selectedDenomination)}`
          ) : (
            'Buy Gift Card'
          )}
        </button>
      </form>
    </div>
  )
}
