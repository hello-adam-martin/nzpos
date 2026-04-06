/**
 * Loyalty Points utility functions — pure, side-effect-free.
 *
 * D-07: Earn and redeem rates are independent merchant-configurable settings.
 * D-09: Points earned on net amount paid — excludes promo discounts, gift card
 *       portions, and loyalty point redemptions (prevents points-on-points loops).
 * D-10: Both earn_rate_cents AND redeem_rate_cents must be non-null for the
 *       loyalty system to activate.
 */

import { formatNZD } from '@/lib/money'

/**
 * Calculates points earned for a given net amount paid.
 *
 * @param netAmountCents - Net amount paid in cents (GST-inclusive, after all discounts).
 *   Must exclude promo discounts, gift card portions, and any loyalty redemption
 *   to prevent points-on-points loops (D-09).
 * @param earnRateCents - Cents per point. E.g. 100 = earn 1 pt per $1 (per $1.00 = 100 cents).
 * @returns Integer points earned (floored — no fractional points).
 */
export function calculatePointsEarned(netAmountCents: number, earnRateCents: number): number {
  if (netAmountCents <= 0 || earnRateCents <= 0) return 0
  return Math.floor(netAmountCents / earnRateCents)
}

/**
 * Calculates the discount in cents for a given number of points redeemed.
 *
 * @param pointsToRedeem - Number of points to redeem. Must be a non-negative integer.
 * @param redeemRateCents - Cents value per point. E.g. 1 = 1 pt = $0.01 (100 pts = $1.00).
 * @returns Discount amount in cents.
 */
export function calculateRedemptionDiscount(pointsToRedeem: number, redeemRateCents: number): number {
  if (pointsToRedeem <= 0 || redeemRateCents <= 0) return 0
  return pointsToRedeem * redeemRateCents
}

/**
 * Formats a loyalty points balance for display to staff or customer.
 *
 * Returns a string like "450 pts ($4.50 available)" — shows both the raw points
 * count and the equivalent dollar value, so staff can communicate the offer clearly
 * (D-05: "Jane: 450 pts ($4.50 available)").
 *
 * @param pointsBalance - Current points balance.
 * @param redeemRateCents - Cents value per point (used to calculate dollar equivalent).
 * @returns Formatted string, e.g. "450 pts ($4.50 available)".
 */
export function formatLoyaltyDisplay(pointsBalance: number, redeemRateCents: number): string {
  const dollarValue = calculateRedemptionDiscount(pointsBalance, redeemRateCents)
  return `${pointsBalance} pts (${formatNZD(dollarValue)} available)`
}
