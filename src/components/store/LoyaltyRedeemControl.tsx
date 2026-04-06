'use client'

import { useState } from 'react'
import { calculateRedemptionDiscount } from '@/lib/loyalty-utils'
import { formatNZD } from '@/lib/money'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface LoyaltyRedeemControlProps {
  pointsBalance: number
  redeemRateCents: number
  isActive: boolean
  onRedeemChange: (pointsToRedeem: number) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * "Use points" toggle for the storefront checkout cart drawer (LOYAL-08).
 *
 * Hidden when: loyalty is not active or the customer has no points balance.
 * Visible when: authenticated customer has points and loyalty is active.
 *
 * Toggle ON  → calls onRedeemChange(pointsBalance) to apply all available points.
 * Toggle OFF → calls onRedeemChange(0) to remove points redemption.
 *
 * Follows the GiftCardInput visual pattern — compact inline control in cart summary area.
 */
export function LoyaltyRedeemControl({
  pointsBalance,
  redeemRateCents,
  isActive,
  onRedeemChange,
}: LoyaltyRedeemControlProps) {
  const [isApplied, setIsApplied] = useState(false)

  // Hidden when loyalty is not active or customer has no points
  if (!isActive || pointsBalance <= 0) {
    return null
  }

  const discountCents = calculateRedemptionDiscount(pointsBalance, redeemRateCents)
  const discountFormatted = formatNZD(discountCents)

  function handleToggle() {
    const next = !isApplied
    setIsApplied(next)
    onRedeemChange(next ? pointsBalance : 0)
  }

  if (isApplied) {
    return (
      <div className="py-3">
        {/* Applied success row */}
        <div className="flex items-start justify-between gap-2 px-3 py-2 rounded-md bg-[var(--color-success)]/10 border border-[var(--color-success)]/30">
          <div className="flex items-start gap-2">
            {/* CheckCircle icon */}
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
                {pointsBalance} pts applied — {discountFormatted} off
              </p>
              <p
                className="text-xs text-[var(--color-text-muted)] mt-0.5"
                style={{ fontFeatureSettings: "'tnum' 1" }}
              >
                {pointsBalance} pts will be deducted after payment
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleToggle}
            className="text-xs text-[var(--color-text-muted)] underline hover:text-[var(--color-text)] transition-colors shrink-0"
          >
            Remove
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="py-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--color-text)]">Use loyalty points</p>
          <p
            className="text-xs text-[var(--color-text-muted)] mt-0.5"
            style={{ fontFeatureSettings: "'tnum' 1" }}
          >
            {pointsBalance} pts available ({discountFormatted})
          </p>
        </div>
        <button
          type="button"
          onClick={handleToggle}
          className="px-3 py-1.5 text-sm font-semibold bg-[var(--color-amber)] text-white rounded-md hover:bg-[var(--color-amber-hover)] transition-colors duration-150 shrink-0"
        >
          Use Points
        </button>
      </div>
    </div>
  )
}
