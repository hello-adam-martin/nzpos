'use server'
import 'server-only'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireFeature } from '@/lib/requireFeature'

const denominationsSchema = z.array(
  z.number().int().min(500, 'Minimum denomination is $5.00').max(50000, 'Maximum denomination is $500.00')
).min(0)

/**
 * Server action: Update the gift card denominations for a store.
 * Requires gift_cards feature subscription.
 * Denominations are stored as integer cents (e.g. 2500 = $25.00).
 */
export async function updateGiftCardDenominations(
  storeId: string,
  denominations: number[]
): Promise<{ success: true } | { error: string }> {
  // Auth + feature gate
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'unauthenticated' }
  }

  const userStoreId = user.app_metadata?.store_id as string | undefined
  if (!userStoreId || userStoreId !== storeId) {
    return { error: 'forbidden' }
  }

  // Feature gate — gift_cards must be active
  const featureResult = await requireFeature('gift_cards')
  if (!featureResult.authorized) {
    return { error: 'feature_not_active' }
  }

  // Validate denominations
  const parsed = denominationsSchema.safeParse(denominations)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'invalid_denominations' }
  }

  // Remove duplicates and sort ascending
  const unique = [...new Set(parsed.data)].sort((a, b) => a - b)

  const { error: updateError } = await supabase
    .from('stores')
    .update({ gift_card_denominations: unique })
    .eq('id', storeId)

  if (updateError) {
    console.error('[updateGiftCardDenominations] DB error:', updateError)
    return { error: 'server_error' }
  }

  return { success: true }
}
