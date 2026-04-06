'use server'
import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { calculateRedemptionDiscount } from '@/lib/loyalty-utils'
import { headers } from 'next/headers'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LoyaltyTransaction = {
  id: string
  pointsDelta: number
  balanceAfter: number
  transactionType: 'earn' | 'redeem' | 'adjustment'
  orderId: string | null
  channel: 'pos' | 'online' | null
  createdAt: string
}

export type CustomerLoyaltyData = {
  isActive: boolean
  pointsBalance: number
  redeemRateCents: number
  dollarValue: number
  bannerDismissed: boolean
  transactions: LoyaltyTransaction[]
}

// ---------------------------------------------------------------------------
// getCustomerLoyalty — fetches authenticated customer's loyalty data
// ---------------------------------------------------------------------------

/**
 * Fetches loyalty data for the authenticated storefront customer.
 *
 * Returns isActive=false if the store has no loyalty subscription or
 * loyalty settings are not configured (both rates must be non-null, D-10).
 *
 * Used on the account profile page (LOYAL-07, LOYAL-11).
 */
export async function getCustomerLoyalty(): Promise<
  { data: CustomerLoyaltyData } | { error: string }
> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.app_metadata?.role !== 'customer') {
    return { error: 'Not authenticated' }
  }

  const headersList = await headers()
  const storeId = headersList.get('x-store-id') ?? process.env.STORE_ID!

  if (!storeId) return { error: 'No store context' }

  const adminClient = createSupabaseAdminClient()

  // Check if store has loyalty subscription
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: storePlan } = await (adminClient as any)
    .from('store_plans')
    .select('has_loyalty_points')
    .eq('store_id', storeId)
    .maybeSingle() as { data: { has_loyalty_points: boolean } | null }

  if (!storePlan?.has_loyalty_points) {
    return {
      data: {
        isActive: false,
        pointsBalance: 0,
        redeemRateCents: 0,
        dollarValue: 0,
        bannerDismissed: true,
        transactions: [],
      },
    }
  }

  // Get loyalty settings
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: settings } = await (adminClient as any)
    .from('loyalty_settings')
    .select('earn_rate_cents, redeem_rate_cents, is_active')
    .eq('store_id', storeId)
    .maybeSingle() as {
      data: {
        earn_rate_cents: number | null
        redeem_rate_cents: number | null
        is_active: boolean
      } | null
    }

  const isActive =
    !!settings &&
    settings.is_active &&
    settings.earn_rate_cents !== null &&
    settings.redeem_rate_cents !== null

  const redeemRateCents = settings?.redeem_rate_cents ?? 0

  // Look up customer record by auth user id
  const { data: customer } = await adminClient
    .from('customers')
    .select('id')
    .eq('store_id', storeId)
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!customer) {
    return {
      data: {
        isActive,
        pointsBalance: 0,
        redeemRateCents,
        dollarValue: 0,
        bannerDismissed: true,
        transactions: [],
      },
    }
  }

  // Fetch loyalty points row
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: loyaltyPoints } = await (adminClient as any)
    .from('loyalty_points')
    .select('points_balance, loyalty_banner_dismissed_at')
    .eq('store_id', storeId)
    .eq('customer_id', customer.id)
    .maybeSingle() as {
      data: {
        points_balance: number
        loyalty_banner_dismissed_at: string | null
      } | null
    }

  const pointsBalance = loyaltyPoints?.points_balance ?? 0
  const bannerDismissed = loyaltyPoints?.loyalty_banner_dismissed_at !== null && loyaltyPoints?.loyalty_banner_dismissed_at !== undefined

  const dollarValue = calculateRedemptionDiscount(pointsBalance, redeemRateCents)

  // Fetch recent transactions (last 10)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: txRows } = await (adminClient as any)
    .from('loyalty_transactions')
    .select('id, points_delta, balance_after, transaction_type, order_id, channel, created_at')
    .eq('store_id', storeId)
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: false })
    .limit(10) as {
      data: Array<{
        id: string
        points_delta: number
        balance_after: number
        transaction_type: string
        order_id: string | null
        channel: string | null
        created_at: string
      }> | null
    }

  const transactions: LoyaltyTransaction[] = (txRows ?? []).map((row) => ({
    id: row.id,
    pointsDelta: row.points_delta,
    balanceAfter: row.balance_after,
    transactionType: row.transaction_type as 'earn' | 'redeem' | 'adjustment',
    orderId: row.order_id,
    channel: row.channel as 'pos' | 'online' | null,
    createdAt: row.created_at,
  }))

  return {
    data: {
      isActive,
      pointsBalance,
      redeemRateCents,
      dollarValue,
      bannerDismissed,
      transactions,
    },
  }
}

// ---------------------------------------------------------------------------
// dismissLoyaltyBanner — marks the one-time privacy banner as dismissed
// ---------------------------------------------------------------------------

/**
 * Dismisses the loyalty privacy banner for the authenticated customer (D-11).
 *
 * If no loyalty_points row exists yet, creates one with zero balance
 * and the dismissed timestamp. Idempotent — safe to call multiple times.
 */
export async function dismissLoyaltyBanner(): Promise<{ success: boolean } | { error: string }> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.app_metadata?.role !== 'customer') {
    return { error: 'Not authenticated' }
  }

  const headersList = await headers()
  const storeId = headersList.get('x-store-id') ?? process.env.STORE_ID!
  if (!storeId) return { error: 'No store context' }

  const adminClient = createSupabaseAdminClient()

  // Look up customer
  const { data: customer } = await adminClient
    .from('customers')
    .select('id')
    .eq('store_id', storeId)
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!customer) return { error: 'Customer not found' }

  // Upsert loyalty_points row with dismissed timestamp
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any)
    .from('loyalty_points')
    .upsert(
      {
        store_id: storeId,
        customer_id: customer.id,
        points_balance: 0,
        loyalty_banner_dismissed_at: new Date().toISOString(),
      },
      {
        onConflict: 'store_id,customer_id',
        ignoreDuplicates: false,
      }
    )

  if (error) {
    console.error('[dismissLoyaltyBanner] error:', error)
    return { error: error.message }
  }

  return { success: true }
}

// ---------------------------------------------------------------------------
// getCustomerLoyaltyForCheckout — lightweight version for CartDrawer (no history)
// ---------------------------------------------------------------------------

/**
 * Lightweight loyalty fetch for checkout — returns only what CartDrawer needs.
 * No transaction history, no banner state. Called on drawer open.
 */
export async function getCustomerLoyaltyForCheckout(): Promise<
  { data: { pointsBalance: number; redeemRateCents: number; isActive: boolean } } | { error: string }
> {
  const result = await getCustomerLoyalty()
  if ('error' in result) return result

  const { isActive, pointsBalance, redeemRateCents } = result.data
  return { data: { isActive, pointsBalance, redeemRateCents } }
}
