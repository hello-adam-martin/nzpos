import 'server-only'
import { format } from 'date-fns'
import { stripe } from '@/lib/stripe'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { PRICE_TO_FEATURE } from '@/config/addons'

/**
 * Normalise amount to MRR cents.
 * - Monthly: pass through as-is
 * - Annual: divide by 12 (rounded)
 * - Trialing: always $0 (caller must check status before calling, but pure function stays simple)
 */
export function normaliseMrrCents(amountCents: number, interval: 'month' | 'year'): number {
  if (interval === 'year') {
    return Math.round(amountCents / 12)
  }
  return amountCents
}

interface SnapshotRow {
  tenant_id: string
  stripe_subscription_id: string
  stripe_customer_id: string
  status: string
  plan_interval: 'month' | 'year'
  amount_cents: number
  mrr_cents: number
  addon_type: string | null
  canceled_at: string | null
  current_period_start: string | null
  current_period_end: string | null
  discount_amount: number
  snapshot_month: string
  synced_at: string
}

/**
 * Sync Stripe subscription data into the platform_analytics_snapshots table.
 *
 * Fetches all stores with a stripe_customer_id, lists all their subscriptions
 * (including items with expanded price data), builds snapshot rows, then:
 * 1. Deletes current month's rows only (preserves historical months)
 * 2. Inserts fresh rows for the current month
 * 3. Updates the last_synced_at metadata timestamp
 *
 * @returns Object with synced row count or error message
 */
export async function syncStripeSnapshot(): Promise<{ synced: number; error?: string }> {
  const currentMonth = format(new Date(), 'yyyy-MM')
  const syncedAt = new Date().toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdminClient() as any

  // Fetch all stores that have a Stripe customer ID
  const { data: stores, error: storesError } = await admin
    .from('stores')
    .select('id, stripe_customer_id')
    .not('stripe_customer_id', 'is', null)

  if (storesError) {
    console.error('[syncStripeSnapshot] Failed to fetch stores:', storesError)
    return { synced: 0, error: 'Failed to fetch stores' }
  }

  const rows: SnapshotRow[] = []

  for (const store of stores ?? []) {
    try {
      // CRITICAL: expand price data so we have interval and unit_amount on items
      // Without expand, items.data[i].price is only a string ID
      const subscriptions = await stripe.subscriptions.list({
        customer: store.stripe_customer_id,
        status: 'all',
        limit: 100,
        expand: ['data.items.data.price'],
      })

      for (const sub of subscriptions.data) {
        for (const item of sub.items.data) {
          const price = item.price
          const interval = (price.recurring?.interval ?? 'month') as 'month' | 'year'
          const amountCents = price.unit_amount ?? 0

          // Trialing subscriptions contribute $0 MRR (D-10)
          const mrrCents =
            sub.status === 'trialing' ? 0 : normaliseMrrCents(amountCents, interval)

          // Resolve addon_type from Price ID (e.g. 'has_xero' -> 'xero')
          const featureFlag = PRICE_TO_FEATURE[price.id]
          const addonType = featureFlag ? featureFlag.replace('has_', '') : null

          // Discount: use actual amount_off from coupon if present (D-10)
          const discountAmount = sub.discount?.coupon?.amount_off ?? 0

          rows.push({
            tenant_id: store.id,
            stripe_subscription_id: sub.id,
            stripe_customer_id: store.stripe_customer_id,
            status: sub.status,
            plan_interval: interval,
            amount_cents: amountCents,
            mrr_cents: mrrCents,
            addon_type: addonType,
            canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
            current_period_start: sub.current_period_start
              ? new Date(sub.current_period_start * 1000).toISOString()
              : null,
            current_period_end: sub.current_period_end
              ? new Date(sub.current_period_end * 1000).toISOString()
              : null,
            discount_amount: discountAmount,
            snapshot_month: currentMonth,
            synced_at: syncedAt,
          })
        }
      }
    } catch (err) {
      console.error(
        `[syncStripeSnapshot] Error fetching subscriptions for customer ${store.stripe_customer_id}:`,
        err
      )
      // Continue to next store — one failure does not block others
    }
  }

  // Delete current month rows only (CRITICAL: scope to current month to preserve history)
  const { error: deleteError } = await admin
    .from('platform_analytics_snapshots')
    .delete()
    .eq('snapshot_month', currentMonth)

  if (deleteError) {
    console.error('[syncStripeSnapshot] Failed to delete current month rows:', deleteError)
    return { synced: 0, error: 'Failed to delete current month rows' }
  }

  // Insert fresh rows (skip if no rows to insert)
  if (rows.length > 0) {
    const { error: insertError } = await admin.from('platform_analytics_snapshots').insert(rows)

    if (insertError) {
      console.error('[syncStripeSnapshot] Failed to insert snapshot rows:', insertError)
      return { synced: 0, error: 'Failed to insert snapshot rows' }
    }
  }

  // Update metadata timestamp
  const { error: metaError } = await admin.from('analytics_sync_metadata').upsert({
    id: 1,
    last_synced_at: syncedAt,
  })

  if (metaError) {
    console.error('[syncStripeSnapshot] Failed to update sync metadata:', metaError)
    // Non-fatal — rows were inserted, just log the error
  }

  return { synced: rows.length }
}
