'use server'
import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export type LoyaltySettings = {
  earn_rate_cents: number | null
  redeem_rate_cents: number | null
  is_active: boolean
}

/**
 * Returns loyalty settings for the authenticated owner's store.
 *
 * Returns default values if no settings row exists yet (pre-configuration state).
 * Both rates being null signals the setup gate (D-10): points do not accumulate.
 */
export async function getLoyaltySettings(): Promise<
  { data: LoyaltySettings } | { error: string }
> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const storeId = user.app_metadata?.store_id as string | undefined
  if (!storeId) return { error: 'No store context' }

  const adminClient = createSupabaseAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (adminClient as any)
    .from('loyalty_settings')
    .select('earn_rate_cents, redeem_rate_cents, is_active')
    .eq('store_id', storeId)
    .maybeSingle() as {
      data: LoyaltySettings | null
      error: { message: string } | null
    }

  if (error) return { error: error.message }

  // Return defaults if no settings row yet (D-10: both rates null = not configured)
  return {
    data: data ?? { earn_rate_cents: null, redeem_rate_cents: null, is_active: true },
  }
}
