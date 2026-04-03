import { headers } from 'next/headers'
import Stripe from 'stripe'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { PRICE_TO_FEATURE } from '@/config/addons'

// Create a new Stripe instance directly for webhook signature verification
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
  // CRITICAL: Use req.text() NOT req.json() — Stripe signature verification requires raw body
  const rawBody = await req.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_BILLING_WEBHOOK_SECRET!
    )
  } catch {
    return new Response('Webhook signature verification failed', { status: 400 })
  }

  const handledTypes = [
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
  ]

  if (handledTypes.includes(event.type)) {
    const subscription = event.data.object as Stripe.Subscription
    try {
      await handleSubscriptionChange(event.id, event.type, subscription)
    } catch (err) {
      console.error('[billing-webhook] handleSubscriptionChange error:', err)
      return new Response('Internal server error', { status: 500 })
    }
  } else {
    console.log(`[billing-webhook] Unhandled event type: ${event.type}`)
  }

  return new Response('ok', { status: 200 })
}

async function handleSubscriptionChange(
  eventId: string,
  eventType: string,
  subscription: Stripe.Subscription
): Promise<void> {
  const supabase = createSupabaseAdminClient()

  // Idempotency check: has this event already been processed?
  const { data: existingEvent } = await supabase
    .from('stripe_events')
    .select('id')
    .eq('id', eventId)
    .maybeSingle()

  if (existingEvent) {
    // Already processed — skip
    return
  }

  // Extract customer ID (may be string or Stripe object)
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id

  // Resolve store_id: first try subscription.metadata.store_id, then fallback to DB lookup
  let storeId: string | undefined = subscription.metadata?.store_id

  if (!storeId) {
    // Fallback: look up store by stripe_customer_id
    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single()

    storeId = store?.id
  }

  if (!storeId) {
    console.error('[billing-webhook] Cannot resolve store_id for customer:', customerId)
    return
  }

  // Capture stripe_customer_id on stores table if not already set
  await supabase
    .from('stores')
    .update({ stripe_customer_id: customerId })
    .eq('id', storeId)
    .is('stripe_customer_id', null)

  // Map price ID to feature column
  const priceId = subscription.items.data[0]?.price.id
  const featureColumn = PRICE_TO_FEATURE[priceId]

  if (!featureColumn) {
    console.log('[billing-webhook] Unrecognized price ID:', priceId)
    // Still record the event for idempotency
    await supabase
      .from('stripe_events')
      .insert({ id: eventId, store_id: storeId, type: eventType })
    return
  }

  // Determine if subscription is active
  const isDeleted = eventType === 'customer.subscription.deleted'
  const isActive = !isDeleted && (
    subscription.status === 'active' || subscription.status === 'trialing'
  )

  // Update store_plans feature flag
  await supabase
    .from('store_plans')
    .update({
      [featureColumn]: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq('store_id', storeId)

  // Record event for idempotency
  const { error: dedupError } = await supabase
    .from('stripe_events')
    .insert({ id: eventId, store_id: storeId, type: eventType })

  if (dedupError && dedupError.code !== '23505') {
    console.error('[billing-webhook] Failed to record event dedup:', dedupError.message)
  }
}
