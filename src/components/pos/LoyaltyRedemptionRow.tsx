'use client'

import { calculateRedemptionDiscount } from '@/lib/loyalty-utils'
import { formatNZD } from '@/lib/money'

interface LoyaltyRedemptionRowProps {
  customerName: string
  pointsBalance: number
  redeemRateCents: number  // cents per point (e.g. 1 = 1 pt = $0.01)
  loyaltyDiscountCents: number | null  // null = not applied
  onApply: (discountCents: number, pointsRedeemed: number) => void
  onRemove: () => void
}

/**
 * Displays a customer's loyalty points and Apply/Remove controls in the POS cart.
 *
 * D-08: No partial points entry — staff applies the full available balance.
 * D-09: Points-on-points prevention is handled server-side in completeSale.
 *
 * Layout: 40px min height, consistent with CartLineItem rows.
 * Amber color (#E67E22) for loyalty-related text/buttons per design system.
 */
export function LoyaltyRedemptionRow({
  customerName,
  pointsBalance,
  redeemRateCents,
  loyaltyDiscountCents,
  onApply,
  onRemove,
}: LoyaltyRedemptionRowProps) {
  const availableDiscountCents = calculateRedemptionDiscount(pointsBalance, redeemRateCents)
  const isApplied = loyaltyDiscountCents !== null

  return (
    <div
      className="animate-[fadeIn_150ms_ease-out] px-3 py-2 min-h-[40px] rounded-lg bg-amber/5 border border-amber/20"
      role="region"
      aria-label="Loyalty points"
    >
      {isApplied ? (
        /* Applied state */
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber truncate">
              Points discount
            </p>
            <p className="text-xs text-text-muted">
              {loyaltyDiscountCents !== null ? formatNZD(loyaltyDiscountCents) : ''} off for {customerName}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-sm font-bold text-amber">
              -{loyaltyDiscountCents !== null ? formatNZD(loyaltyDiscountCents) : ''}
            </span>
            <button
              type="button"
              onClick={onRemove}
              className="min-h-[44px] px-3 text-sm font-semibold text-navy border border-border rounded-lg hover:bg-surface transition-colors whitespace-nowrap"
              aria-label="Remove loyalty discount"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        /* Available state */
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text truncate">
              {customerName}
            </p>
            {availableDiscountCents > 0 ? (
              <p className="text-xs text-amber font-medium">
                {pointsBalance} pts ({formatNZD(availableDiscountCents)} available)
              </p>
            ) : (
              <p className="text-xs text-text-muted">
                {pointsBalance} pts (no value yet)
              </p>
            )}
          </div>
          {availableDiscountCents > 0 && (
            <button
              type="button"
              onClick={() => onApply(availableDiscountCents, pointsBalance)}
              className="min-h-[44px] px-3 text-sm font-bold bg-amber text-white rounded-lg hover:bg-amber/90 transition-colors whitespace-nowrap flex-shrink-0"
              aria-label={`Apply ${formatNZD(availableDiscountCents)} loyalty discount`}
            >
              Apply
            </button>
          )}
        </div>
      )}
    </div>
  )
}
