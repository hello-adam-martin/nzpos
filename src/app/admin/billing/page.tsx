import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import Stripe from 'stripe'
import { formatNZD } from '@/lib/money'
import { ADDONS, PRICE_ID_MAP } from '@/config/addons'
import BillingClient from './BillingClient'

export const dynamic = 'force-dynamic'

/**
 * /admin/billing — Add-on billing management page.
 * Shows all add-ons with their subscription status and subscribe/manage actions.
 */
export default async function BillingPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const storeId = user?.app_metadata?.store_id as string | undefined
  if (!storeId) {
    redirect('/login')
  }

  const adminClient = createSupabaseAdminClient()

  // Fetch store_plans and stripe_customer_id in parallel
  const [storePlansResult, storeResult] = await Promise.all([
    adminClient
      .from('store_plans')
      .select('has_xero, has_custom_domain, has_inventory')
      .eq('store_id', storeId)
      .single(),
    adminClient
      .from('stores')
      .select('stripe_customer_id')
      .eq('id', storeId)
      .single(),
  ])

  const storePlans = storePlansResult.data ?? {
    has_xero: false,
    has_custom_domain: false,
    has_inventory: false,
  }

  const stripeCustomerId = storeResult.data?.stripe_customer_id ?? null

  // Fetch subscription details from Stripe if customer exists
  type SubDetail = {
    feature: string
    status: 'active' | 'trialing' | 'canceled'
    trialEnd: string | null
    created: string
  }

  let subscriptionDetails: SubDetail[] = []

  if (stripeCustomerId) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
      const subs = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: 'all',
        limit: 10,
        expand: ['data.items'],
      })

      // Map each subscription item to a feature
      for (const sub of subs.data) {
        for (const item of sub.items.data) {
          // Find which feature this price belongs to
          const matchedAddon = ADDONS.find(
            (addon) => PRICE_ID_MAP[addon.feature] === item.price.id
          )
          if (!matchedAddon) continue

          const subStatus =
            sub.status === 'trialing'
              ? 'trialing'
              : sub.status === 'active'
              ? 'active'
              : 'canceled'

          subscriptionDetails.push({
            feature: matchedAddon.feature,
            status: subStatus,
            trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
            created: new Date(sub.created * 1000).toISOString(),
          })
        }
      }
    } catch (err) {
      console.error('[BillingPage] Failed to fetch Stripe subscriptions:', err)
      // Continue with empty subscription details — store_plans flags still drive access
    }
  }

  // Fetch price amounts from Stripe for display
  const prices: Record<string, string> = {}
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    await Promise.all(
      ADDONS.map(async (addon) => {
        const priceId = PRICE_ID_MAP[addon.feature]
        if (!priceId) return
        try {
          const price = await stripe.prices.retrieve(priceId)
          if (price.unit_amount != null) {
            prices[addon.feature] = formatNZD(price.unit_amount)
          }
        } catch {
          // Price not found — priceDisplay will be undefined, showing "Subscribe to {name}"
        }
      })
    )
  } catch (err) {
    console.error('[BillingPage] Failed to fetch Stripe prices:', err)
  }

  return (
    <div className="space-y-[var(--space-xl)] max-w-3xl">
      <div>
        <h1 className="font-display font-semibold text-2xl text-[var(--color-text)]">Billing</h1>
        <p className="mt-1 text-base font-sans text-[var(--color-text-muted)]">
          Manage your add-ons and billing settings.
        </p>
      </div>

      <BillingClient
        storePlans={storePlans}
        stripeCustomerId={stripeCustomerId}
        subscriptionDetails={subscriptionDetails}
        prices={prices}
      />
    </div>
  )
}
