import 'server-only'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { OnlineReceiptEmail } from '@/emails/OnlineReceiptEmail'
import type { ReceiptData } from '@/lib/receipt'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
  // CRITICAL: Use req.text() NOT req.json() — Stripe signature verification requires raw body
  const rawBody = await req.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')!

  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch {
    return new Response('Webhook signature verification failed', { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    try {
      await handleCheckoutComplete(event.id, session)
    } catch (err) {
      console.error('[stripe-webhook] handleCheckoutComplete error:', err)
      return new Response('Internal server error', { status: 500 })
    }
  } else {
    console.log(`[stripe-webhook] Unhandled event type: ${event.type}`)
  }

  return new Response('ok', { status: 200 })
}

async function handleCheckoutComplete(
  eventId: string,
  session: Stripe.Checkout.Session
): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const storeId = session.metadata?.store_id
  const orderId = session.metadata?.order_id

  if (!storeId || !orderId) {
    console.error('[stripe-webhook] Missing metadata on session:', session.id)
    return
  }

  // Idempotency check: has this event already been fully processed?
  // Check FIRST, insert AFTER success — prevents dedup from blocking retries on failure.
  const { data: existingEvent } = await supabase
    .from('stripe_events')
    .select('id')
    .eq('id', eventId)
    .maybeSingle()

  if (existingEvent) {
    // Already processed successfully — skip
    return
  }

  // Fetch order_items to pass to RPC (CRITICAL — without this, stock decrement has no items)
  const { data: orderItems, error: itemsError } = await supabase
    .from('order_items')
    .select('product_id, quantity')
    .eq('order_id', orderId)

  if (itemsError) {
    throw itemsError
  }

  // Call complete_online_sale RPC: atomically updates order status and decrements stock
  const { error: rpcError } = await supabase.rpc('complete_online_sale', {
    p_store_id: storeId,
    p_order_id: orderId,
    p_stripe_session_id: session.id,
    p_stripe_payment_intent_id: (session.payment_intent as string) ?? undefined,
    p_customer_email: session.customer_details?.email ?? undefined,
    p_items: orderItems ?? [],
  })

  if (rpcError) throw rpcError

  // NOTIF-01: Send online receipt email (fire-and-forget per D-05 — must not block webhook response)
  const customerEmail = session.customer_details?.email
  if (customerEmail) {
    // Fetch order with receipt_data (stored by complete_online_sale RPC if available)
    const { data: orderData } = await supabase
      .from('orders')
      .select('id, total_cents, created_at, receipt_data')
      .eq('id', orderId)
      .single()

    if (orderData?.receipt_data) {
      // Use pre-built receipt_data stored by the RPC
      const receipt = orderData.receipt_data as ReceiptData
      void sendEmail({
        to: customerEmail,
        subject: `Your receipt from ${receipt.storeName}`,
        react: OnlineReceiptEmail({ receipt }),
      })
    } else {
      // Fallback: build receipt from order_items joined with products + store
      const { data: fullItems } = await supabase
        .from('order_items')
        .select('product_id, quantity, unit_price_cents, line_total_cents, discount_cents, products(name)')
        .eq('order_id', orderId)

      const { data: store } = await supabase
        .from('stores')
        .select('name, address, phone, gst_number')
        .eq('id', storeId)
        .single()

      if (fullItems && store) {
        const items = fullItems.map(item => ({
          productId: item.product_id,
          productName: (item.products as { name: string } | null)?.name ?? 'Unknown',
          quantity: item.quantity,
          unitPriceCents: item.unit_price_cents,
          discountCents: item.discount_cents ?? 0,
          lineTotalCents: item.line_total_cents,
          gstCents: Math.round(item.line_total_cents * 3 / 23),
        }))
        const totalCents = orderData?.total_cents ?? items.reduce((s, i) => s + i.lineTotalCents, 0)
        const gstCents = Math.round(totalCents * 3 / 23)
        const receipt: ReceiptData = {
          orderId,
          storeName: store.name,
          storeAddress: store.address ?? '',
          storePhone: store.phone ?? '',
          gstNumber: store.gst_number ?? '',
          completedAt: orderData?.created_at ?? new Date().toISOString(),
          staffName: 'Online',
          items,
          subtotalCents: totalCents,
          gstCents,
          totalCents,
          paymentMethod: 'online',
        }
        void sendEmail({
          to: customerEmail,
          subject: `Your receipt from ${store.name}`,
          react: OnlineReceiptEmail({ receipt }),
        })
      }
    }
  }

  // Mark event as processed AFTER successful RPC — retries will work if RPC fails
  const { error: dedupError } = await supabase
    .from('stripe_events')
    .insert({ id: eventId, store_id: storeId, type: 'checkout.session.completed' })

  if (dedupError && dedupError.code !== '23505') {
    // Non-dedup error — log but don't fail (order is already completed)
    console.error('[stripe-webhook] Failed to record event dedup:', dedupError.message)
  }

  // Increment promo usage atomically (only after successful payment)
  const { data: orderRow } = await (supabase as any)
    .from('orders')
    .select('promo_id')
    .eq('id', orderId)
    .single()

  if (orderRow?.promo_id) {
    await supabase.rpc('increment_promo_uses', { p_promo_id: orderRow.promo_id })
  }
}
