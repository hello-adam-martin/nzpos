'use server'
import 'server-only'
import { z } from 'zod'
import { resolveStaffAuth } from '@/lib/resolveAuth'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { GiftCardEmail } from '@/emails/GiftCardEmail'
import { generateGiftCardCode, formatGiftCardCode } from '@/lib/gift-card-utils'
import React from 'react'

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const IssueGiftCardSchema = z.object({
  valueCents: z.number().int().positive(),
  buyerEmail: z.string().email().optional(),
})

type IssueGiftCardResult =
  | {
      success: true
      code: string
      displayCode: string
      valueCents: number
      expiresAt: string
    }
  | { success: false; error: string }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generates a unique 8-digit numeric code for the given store.
 * Retries up to 10 times on collision (statistically near-impossible in practice).
 */
async function generateUniqueCode(storeId: string, supabase: ReturnType<typeof createSupabaseAdminClient>): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateGiftCardCode()
    const { data } = await supabase
      .from('gift_cards')
      .select('id')
      .eq('store_id', storeId)
      .eq('code', code)
      .maybeSingle()
    if (!data) return code
  }
  throw new Error('Failed to generate unique gift card code after 10 attempts')
}

// ---------------------------------------------------------------------------
// Server Action
// ---------------------------------------------------------------------------

/**
 * Issues a gift card at POS (staff-initiated).
 *
 * - Requires staff authentication (resolveStaffAuth)
 * - Checks store has gift cards feature enabled
 * - Generates unique 8-digit numeric code
 * - Calls issue_gift_card RPC (SECURITY DEFINER, sets 3-year expiry)
 * - Sends delivery email if buyerEmail provided (fire-and-forget)
 * - Returns the code and display-formatted code (XXXX-XXXX)
 *
 * Never writes to orders table (GIFT-09).
 */
export async function issueGiftCard(input: unknown): Promise<IssueGiftCardResult> {
  // 1. Auth — staff session required
  const staff = await resolveStaffAuth()
  if (!staff) {
    return { success: false, error: 'Not authenticated — please log in again' }
  }

  // 2. Validate input
  const parsed = IssueGiftCardSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' }
  }

  const { valueCents, buyerEmail } = parsed.data
  const supabase = createSupabaseAdminClient()

  // 3. Check gift cards feature enabled for this store
  const { data: storePlan } = await supabase
    .from('store_plans')
    .select('has_gift_cards')
    .eq('store_id', staff.store_id)
    .single()

  if (!storePlan?.has_gift_cards) {
    return { success: false, error: 'Gift cards are not enabled for this store' }
  }

  // 4. Fetch store name for email and return value
  const { data: store } = await supabase
    .from('stores')
    .select('name')
    .eq('id', staff.store_id)
    .single()

  const storeName = store?.name ?? 'Store'

  // 5. Generate unique code
  let code: string
  try {
    code = await generateUniqueCode(staff.store_id, supabase)
  } catch (err) {
    console.error('[issueGiftCard] Code generation failed:', err)
    return { success: false, error: 'Failed to generate gift card code. Please try again.' }
  }

  // 6. Call issue_gift_card RPC (sets expires_at = now() + 3 years, inserts gift_cards row)
  const { data: rpcResult, error: rpcError } = await supabase.rpc('issue_gift_card', {
    p_store_id: staff.store_id,
    p_code: code,
    p_value_cents: valueCents,
    p_channel: 'pos',
    p_buyer_email: buyerEmail ?? null,
    p_stripe_session_id: null,
  })

  if (rpcError) {
    console.error('[issueGiftCard] RPC error store_id=%s:', staff.store_id, rpcError)
    return { success: false, error: 'Failed to issue gift card. Please try again.' }
  }

  const result = rpcResult as { gift_card_id: string; expires_at: string }
  const expiresAt = result.expires_at

  // 7. Send delivery email (fire-and-forget — non-blocking per D-05)
  if (buyerEmail) {
    void sendEmail({
      to: buyerEmail,
      subject: `Your gift card from ${storeName}`,
      react: React.createElement(GiftCardEmail, {
        code,
        balanceCents: valueCents,
        expiresAt,
        storeName,
      }),
    })
  }

  return {
    success: true,
    code,
    displayCode: formatGiftCardCode(code),
    valueCents,
    expiresAt,
  }
}
