import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { FEATURE_TO_COLUMN, type SubscriptionFeature } from '@/config/addons'

export type GatedFeature = SubscriptionFeature

type FeatureResult =
  | { authorized: true }
  | { authorized: false; feature: GatedFeature; upgradeUrl: string }

/**
 * Guard utility for feature-gated functionality.
 *
 * Fast path (default): Reads feature flag from JWT claims (app_metadata).
 * DB fallback (requireDbCheck: true): Queries store_plans table directly.
 * Use DB fallback for critical mutations where stale JWT claims are unacceptable.
 *
 * Always returns a structured result — never throws.
 * Per D-08: structured return { authorized, feature, upgradeUrl }.
 */
export async function requireFeature(
  feature: GatedFeature,
  { requireDbCheck = false }: { requireDbCheck?: boolean } = {}
): Promise<FeatureResult> {
  const upgradeUrl = `/admin/billing?upgrade=${feature}`
  const denied: FeatureResult = { authorized: false, feature, upgradeUrl }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // No authenticated user or no store context → deny
  if (!user?.app_metadata?.store_id) return denied

  // Fast path: JWT claims (per D-07, avoids DB round-trip on every request)
  if (!requireDbCheck) {
    const jwtValue = user.app_metadata?.[feature] as boolean | undefined
    return jwtValue === true ? { authorized: true } : denied
  }

  // DB fallback for critical mutations (per D-07)
  const storeId = user.app_metadata.store_id as string
  const column = FEATURE_TO_COLUMN[feature]
  const admin = createSupabaseAdminClient()
  const { data: plan } = await admin
    .from('store_plans')
    .select(column)
    .eq('store_id', storeId)
    .single()

  return plan?.[column as keyof typeof plan] === true ? { authorized: true } : denied
}
