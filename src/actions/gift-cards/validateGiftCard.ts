'use server'
import 'server-only'
import { z } from 'zod'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { normalizeGiftCardCode, effectiveGiftCardStatus } from '@/lib/gift-card-utils'

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const ValidateGiftCardSchema = z.object({
  storeId: z.string().uuid(),
  // Strip non-numeric characters (handles XXXX-XXXX format from user input — Pitfall 3)
  code: z.string().transform((s) => normalizeGiftCardCode(s)),
})

export type ValidateGiftCardResult =
  | {
      valid: true
      balanceCents: number
      expiresAt: string
      giftCardId: string
    }
  | {
      valid: false
      error:
        | 'GIFT_CARD_NOT_FOUND'
        | 'GIFT_CARD_EXPIRED'
        | 'GIFT_CARD_VOIDED'
        | 'GIFT_CARD_ZERO_BALANCE'
    }

// ---------------------------------------------------------------------------
// Server Action
// ---------------------------------------------------------------------------

/**
 * Validates a gift card code for POS or online checkout.
 *
 * - Strips non-numeric characters from code input (Pitfall 3)
 * - Checks effective expiry: active status + past expires_at = expired (Pitfall 2)
 * - Returns structured error codes per UI-SPEC error message map
 *
 * Safe to call without staff authentication — storeId scope prevents cross-tenant access.
 */
export async function validateGiftCard(input: unknown): Promise<ValidateGiftCardResult> {
  const parsed = ValidateGiftCardSchema.safeParse(input)
  if (!parsed.success) {
    return { valid: false, error: 'GIFT_CARD_NOT_FOUND' }
  }

  const { storeId, code } = parsed.data
  const supabase = createSupabaseAdminClient()

  // Query gift_cards by store_id + code (tenant-scoped)
  const { data: card } = await supabase
    .from('gift_cards')
    .select('id, balance_cents, status, expires_at')
    .eq('store_id', storeId)
    .eq('code', code)
    .maybeSingle()

  if (!card) {
    return { valid: false, error: 'GIFT_CARD_NOT_FOUND' }
  }

  // Compute effective status — active past expires_at is treated as expired (Pitfall 2)
  const effective = effectiveGiftCardStatus(
    card.status as 'active' | 'redeemed' | 'expired' | 'voided',
    card.expires_at
  )

  if (effective === 'expired' || effective === 'redeemed') {
    return { valid: false, error: 'GIFT_CARD_EXPIRED' }
  }

  if (effective === 'voided') {
    return { valid: false, error: 'GIFT_CARD_VOIDED' }
  }

  if (card.balance_cents <= 0) {
    return { valid: false, error: 'GIFT_CARD_ZERO_BALANCE' }
  }

  return {
    valid: true,
    balanceCents: card.balance_cents,
    expiresAt: card.expires_at,
    giftCardId: card.id,
  }
}
