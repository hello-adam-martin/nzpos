/**
 * Gift card utility functions — pure, testable, no server dependencies.
 *
 * Used by server actions (issueGiftCard, validateGiftCard) and Vitest unit tests.
 */

/**
 * Generates an 8-digit numeric gift card code string with leading zeros.
 * Callers must verify uniqueness against the database.
 */
export function generateGiftCardCode(): string {
  return String(Math.floor(Math.random() * 100_000_000)).padStart(8, '0')
}

/**
 * Formats an 8-digit numeric code as XXXX-XXXX.
 * Example: '48271593' → '4827-1593'
 */
export function formatGiftCardCode(code: string): string {
  const digits = code.replace(/\D/g, '')
  return `${digits.slice(0, 4)}-${digits.slice(4)}`
}

/**
 * Strips all non-numeric characters from a gift card code input.
 * Handles user input like '4827-1593' → '48271593'.
 */
export function normalizeGiftCardCode(input: string): string {
  return input.replace(/\D/g, '')
}

type GiftCardStatus = 'active' | 'redeemed' | 'expired' | 'voided'

/**
 * Computes the effective status of a gift card, accounting for the case
 * where the DB status is 'active' but the expiry has passed (Pitfall 2).
 */
export function effectiveGiftCardStatus(
  status: GiftCardStatus,
  expiresAt: string
): GiftCardStatus {
  if (status === 'active' && new Date(expiresAt) < new Date()) {
    return 'expired'
  }
  return status
}

/**
 * Computes the auto-split amounts for a gift card payment (D-06).
 *
 * Returns:
 * - giftCardAmount: amount to charge to the gift card (min of balance and total)
 * - remainder: remaining amount due via another method (0 if gift card covers all)
 */
export function computeGiftCardSplit(
  balanceCents: number,
  totalCents: number
): { giftCardAmount: number; remainder: number } {
  const giftCardAmount = Math.min(balanceCents, totalCents)
  const remainder = totalCents - giftCardAmount
  return { giftCardAmount, remainder }
}
