'use server'
import 'server-only'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { POS_ROLES } from '@/config/roles'

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const saveLoyaltySettingsSchema = z.object({
  earn_rate_cents: z.number().int().positive(),
  redeem_rate_cents: z.number().int().positive(),
  is_active: z.boolean(),
})

export type SaveLoyaltySettingsInput = z.infer<typeof saveLoyaltySettingsSchema>

// ---------------------------------------------------------------------------
// Server Action
// ---------------------------------------------------------------------------

/**
 * Saves loyalty settings (earn rate, redeem rate, active toggle) for the store.
 *
 * - Owner-only (RBAC guard via app_metadata.role)
 * - Validates earn_rate_cents and redeem_rate_cents are positive integers
 * - Uses UPSERT on store_id so multiple saves are idempotent
 * - Once both rates are saved, the setup gate (D-10) clears and earning activates
 *
 * Rate convention (integer cents):
 * - earn_rate_cents = 100 means "100 cents per point earned" → 1 pt per $1 spent
 * - redeem_rate_cents = 1 means "1 cent per point redeemed" → 100 pts = $1 discount
 */
export async function saveLoyaltySettings(
  input: unknown
): Promise<{ success: true } | { error: string }> {
  // 1. Auth
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }
  if (user.app_metadata?.role !== POS_ROLES.OWNER) return { error: 'INSUFFICIENT_ROLE' }

  const storeId = user.app_metadata?.store_id as string | undefined
  if (!storeId) return { error: 'No store context' }

  // 2. Validate input
  const parsed = saveLoyaltySettingsSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const { earn_rate_cents, redeem_rate_cents, is_active } = parsed.data

  // 3. Upsert loyalty_settings
  const adminClient = createSupabaseAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any)
    .from('loyalty_settings')
    .upsert(
      {
        store_id: storeId,
        earn_rate_cents,
        redeem_rate_cents,
        is_active,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'store_id' }
    )

  if (error) {
    console.error('[saveLoyaltySettings] DB error store_id=%s:', storeId, error)
    return { error: 'Failed to save loyalty settings. Please try again.' }
  }

  return { success: true }
}
