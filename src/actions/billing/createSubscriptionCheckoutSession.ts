'use server'
import 'server-only'
import Stripe from 'stripe'
import { z } from 'zod'
import { headers } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { PRICE_ID_MAP } from '@/config/addons'
import type { SubscriptionFeature } from '@/config/addons'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const featureSchema = z.enum(['xero', 'custom_domain', 'inventory', 'gift_cards', 'advanced_reporting'])

type Result = { url: string } | { error: string }

export async function createSubscriptionCheckoutSession(
  feature: SubscriptionFeature
): Promise<Result> {
  // Validate feature param
  const parsed = featureSchema.safeParse(feature)
  if (!parsed.success) {
    return { error: 'invalid_feature' }
  }
  const validFeature = parsed.data

  // Auth check
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'unauthenticated' }
  }

  const storeId = user.app_metadata?.store_id as string | undefined
  if (!storeId) {
    return { error: 'no_store' }
  }

  // Look up existing stripe_customer_id
  const adminClient = createSupabaseAdminClient()
  const { data: store } = await adminClient
    .from('stores')
    .select('id, stripe_customer_id')
    .eq('id', storeId)
    .single()

  // Build base URL from host header
  const headersList = await headers()
  const host = headersList.get('host') ?? 'localhost:3000'
  const protocol = host.includes('localhost') || host.includes('lvh.me') ? 'http' : 'https'
  const baseUrl = `${protocol}://${host}`

  // Get price ID for the feature
  const priceId = PRICE_ID_MAP[validFeature]

  // Build success and cancel URLs
  const successUrl = `${baseUrl}/admin/billing?subscribed=${validFeature}`
  const cancelUrl = `${baseUrl}/admin/billing`

  // Build checkout session params
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 14,
      metadata: {
        store_id: storeId,
        feature: validFeature,
      },
    },
    metadata: {
      store_id: storeId,
      feature: validFeature,
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  }

  // Reuse existing Stripe customer if available
  if (store?.stripe_customer_id) {
    sessionParams.customer = store.stripe_customer_id
  }

  try {
    const session = await stripe.checkout.sessions.create(sessionParams)

    if (!session.url) {
      console.error('[createSubscriptionCheckoutSession] Stripe session created but no URL returned')
      return { error: 'server_error' }
    }

    return { url: session.url }
  } catch (err) {
    console.error('[createSubscriptionCheckoutSession] Stripe error:', err)
    return { error: 'server_error' }
  }
}
