'use server'
import 'server-only'
import { z } from 'zod'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveStaffAuth } from '@/lib/resolveAuth'
import { effectiveGiftCardStatus, formatGiftCardCode } from '@/lib/gift-card-utils'

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const GetGiftCardSchema = z.object({
  giftCardId: z.string().uuid(),
})

export type GiftCardRedemption = {
  id: string
  amount_cents: number
  balance_after_cents: number
  redeemed_at: string
  channel: string
  order_id: string | null
  staff_name: string | null
}

export type GiftCardDetail = {
  id: string
  code: string           // Full 8-digit formatted code (e.g. '4827-1593')
  original_value_cents: number
  balance_cents: number
  status: 'active' | 'redeemed' | 'expired' | 'voided'
  issued_at: string
  expires_at: string
  voided_at: string | null
  void_reason: string | null
  purchase_channel: string
  buyer_email: string | null
  redemptions: GiftCardRedemption[]
}

export type GetGiftCardResult =
  | { success: true; data: GiftCardDetail }
  | { success: false; error: string }

// ---------------------------------------------------------------------------
// Server Action
// ---------------------------------------------------------------------------

/**
 * Fetches a single gift card with its full transaction history (redemptions).
 *
 * - Returns full 8-digit code formatted as XXXX-XXXX (admin detail view)
 * - Computes effective status for active cards past expiry (Pitfall 2)
 * - Joins staff names for redemptions where staff_id is present
 * - Staff auth required; gift card must belong to authenticated store
 */
export async function getGiftCard(input: unknown): Promise<GetGiftCardResult> {
  const staff = await resolveStaffAuth()
  if (!staff) return { success: false, error: 'Not authenticated' }

  const parsed = GetGiftCardSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Invalid gift card ID' }
  }

  const { giftCardId } = parsed.data
  const storeId = staff.store_id
  const supabase = createSupabaseAdminClient()

  // Fetch gift card (must belong to this store)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: card, error: cardError } = await (supabase as any)
    .from('gift_cards')
    .select('id, code, original_value_cents, balance_cents, status, issued_at, expires_at, voided_at, void_reason, purchase_channel, buyer_email')
    .eq('id', giftCardId)
    .eq('store_id', storeId)
    .maybeSingle()

  if (cardError) {
    console.error('[getGiftCard] store_id=%s giftCardId=%s error:', storeId, giftCardId, cardError)
    return { success: false, error: 'Failed to fetch gift card' }
  }

  if (!card) {
    return { success: false, error: 'Gift card not found' }
  }

  // Fetch redemptions ordered by redeemed_at ASC (for timeline)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: redemptions, error: redemptionsError } = await (supabase as any)
    .from('gift_card_redemptions')
    .select('id, amount_cents, balance_after_cents, redeemed_at, channel, order_id, staff_id')
    .eq('gift_card_id', giftCardId)
    .eq('store_id', storeId)
    .order('redeemed_at', { ascending: true })

  if (redemptionsError) {
    console.error('[getGiftCard] redemptions error store_id=%s giftCardId=%s:', storeId, giftCardId, redemptionsError)
    return { success: false, error: 'Failed to fetch redemption history' }
  }

  // Collect unique staff IDs for name join
  const staffIds = [...new Set(
    (redemptions ?? [])
      .map((r: { staff_id: string | null }) => r.staff_id)
      .filter(Boolean) as string[]
  )]

  // Fetch staff names in one query
  const staffNameMap = new Map<string, string>()
  if (staffIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: staffRecords } = await (supabase as any)
      .from('staff')
      .select('id, name')
      .in('id', staffIds)
      .eq('store_id', storeId)

    for (const s of (staffRecords ?? [])) {
      staffNameMap.set(s.id, s.name)
    }
  }

  const redemptionRows: GiftCardRedemption[] = (redemptions ?? []).map((r: {
    id: string
    amount_cents: number
    balance_after_cents: number
    redeemed_at: string
    channel: string
    order_id: string | null
    staff_id: string | null
  }) => ({
    id: r.id,
    amount_cents: r.amount_cents,
    balance_after_cents: r.balance_after_cents,
    redeemed_at: r.redeemed_at,
    channel: r.channel,
    order_id: r.order_id,
    staff_name: r.staff_id ? (staffNameMap.get(r.staff_id) ?? null) : null,
  }))

  const effectiveStatus = effectiveGiftCardStatus(
    card.status as 'active' | 'redeemed' | 'expired' | 'voided',
    card.expires_at
  )

  return {
    success: true,
    data: {
      id: card.id,
      code: formatGiftCardCode(card.code),
      original_value_cents: card.original_value_cents,
      balance_cents: card.balance_cents,
      status: effectiveStatus,
      issued_at: card.issued_at,
      expires_at: card.expires_at,
      voided_at: card.voided_at ?? null,
      void_reason: card.void_reason ?? null,
      purchase_channel: card.purchase_channel,
      buyer_email: card.buyer_email ?? null,
      redemptions: redemptionRows,
    },
  }
}
