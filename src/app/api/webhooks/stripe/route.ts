import 'server-only'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { OnlineReceiptEmail } from '@/emails/OnlineReceiptEmail'
import { GiftCardEmail } from '@/emails/GiftCardEmail'
import React from 'react'
import type { ReceiptData } from '@/lib/receipt'
import { generateGiftCardCode, formatGiftCardCode } from '@/lib/gift-card-utils'

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

  if (!storeId) {
    console.error('[stripe-webhook] Missing store_id metadata on session:', session.id)
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

  // ---------------------------------------------------------------------------
  // Gift card purchase path (D-04 online): type === 'gift_card' in metadata
  // ---------------------------------------------------------------------------
  if (session.metadata?.type === 'gift_card') {
    await handleGiftCardCheckoutComplete(eventId, session, supabase, storeId)
    return
  }

  // ---------------------------------------------------------------------------
  // Normal product order path — requires order_id in metadata
  // ---------------------------------------------------------------------------
  const orderId = session.metadata?.order_id

  if (!orderId) {
    console.error('[stripe-webhook] Missing order_id metadata on session:', session.id)
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

  // ---------------------------------------------------------------------------
  // Partial gift card redemption (D-12, Pitfall 1 prevention)
  // Gift card balance is deducted HERE (after Stripe confirms payment) — not in createCheckoutSession.
  // Failure is logged as warning; does NOT block order completion or email.
  // ---------------------------------------------------------------------------
  const giftCardCode = session.metadata?.gift_card_code
  const giftCardAmountCentsStr = session.metadata?.gift_card_amount_cents

  if (giftCardCode && giftCardAmountCentsStr) {
    const giftCardAmountCents = Number(giftCardAmountCentsStr)

    if (!isNaN(giftCardAmountCents) && giftCardAmountCents > 0) {
      // Look up gift card by code to get its ID (RPC requires UUID, not code)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: giftCard } = await (supabase as any)
        .from('gift_cards')
        .select('id')
        .eq('store_id', storeId)
        .eq('code', giftCardCode)
        .maybeSingle() as { data: { id: string } | null }

      if (giftCard?.id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: redemptionError } = await (supabase as any).rpc('redeem_gift_card', {
          p_store_id: storeId,
          p_gift_card_id: giftCard.id,
          p_amount_cents: giftCardAmountCents,
          p_channel: 'online',
          p_order_id: orderId,
          p_staff_id: null,
        })

        if (redemptionError) {
          console.warn(
            '[stripe-webhook] Partial gift card redemption warning store_id=%s order_id=%s:',
            storeId,
            orderId,
            redemptionError
          )
          // Order is already completed — log warning but don't fail webhook
        } else {
          console.log(
            '[stripe-webhook] Partial gift card redeemed: gift_card_id=%s amount=%d order_id=%s',
            giftCard.id,
            giftCardAmountCents,
            orderId
          )
        }
      } else {
        console.warn(
          '[stripe-webhook] Partial gift card not found by code for order_id=%s',
          orderId
        )
      }
    }
  }

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

// ---------------------------------------------------------------------------
// Gift card specific handler
// ---------------------------------------------------------------------------

/**
 * Handles checkout.session.completed for gift card purchases.
 *
 * - Generates unique code (same algorithm as issueGiftCard)
 * - Calls issue_gift_card RPC with channel='online' and stripe_session_id
 * - Sends GiftCardEmail delivery (fire-and-forget)
 * - Marks event as processed for idempotency
 * - Never touches orders table (GIFT-09)
 */
async function handleGiftCardCheckoutComplete(
  eventId: string,
  session: Stripe.Checkout.Session,
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  storeId: string
): Promise<void> {
  const { denomination_cents, buyer_email } = session.metadata ?? {}

  if (!denomination_cents || !buyer_email) {
    console.error('[stripe-webhook] Gift card session missing denomination_cents or buyer_email:', session.id)
    return
  }

  const denominationCents = Number(denomination_cents)
  if (isNaN(denominationCents) || denominationCents <= 0) {
    console.error('[stripe-webhook] Gift card denomination_cents invalid:', denomination_cents)
    return
  }

  // Generate unique 8-digit code (retry up to 10 times on collision)
  let code: string | null = null
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = generateGiftCardCode()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase as any)
      .from('gift_cards')
      .select('id')
      .eq('store_id', storeId)
      .eq('code', candidate)
      .maybeSingle()
    if (!existing) {
      code = candidate
      break
    }
  }

  if (!code) {
    console.error('[stripe-webhook] Gift card: failed to generate unique code after 10 attempts, session:', session.id)
    throw new Error('Gift card code generation failed')
  }

  // Call issue_gift_card RPC (SECURITY DEFINER, sets 3-year expiry, inserts gift_cards row)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rpcResult, error: rpcError } = await (supabase as any).rpc('issue_gift_card', {
    p_store_id: storeId,
    p_code: code,
    p_value_cents: denominationCents,
    p_channel: 'online',
    p_buyer_email: buyer_email,
    p_stripe_session_id: session.id,
  })

  if (rpcError) {
    console.error('[stripe-webhook] issue_gift_card RPC error store_id=%s:', storeId, rpcError)
    throw rpcError
  }

  const result = rpcResult as unknown as { gift_card_id: string; expires_at: string }
  const expiresAt = result.expires_at

  // Fetch store name for email
  const { data: store } = await supabase
    .from('stores')
    .select('name')
    .eq('id', storeId)
    .single()

  const storeName = store?.name ?? 'Store'

  // Send gift card delivery email (fire-and-forget per D-05)
  void sendEmail({
    to: buyer_email,
    subject: `Your gift card from ${storeName}`,
    react: React.createElement(GiftCardEmail, {
      code,
      balanceCents: denominationCents,
      expiresAt,
      storeName,
    }),
  })

  // Mark event as processed AFTER successful RPC — retries will work if RPC fails
  const { error: dedupError } = await supabase
    .from('stripe_events')
    .insert({ id: eventId, store_id: storeId, type: 'checkout.session.completed' })

  if (dedupError && dedupError.code !== '23505') {
    console.error('[stripe-webhook] Gift card: failed to record event dedup:', dedupError.message)
  }

  console.log('[stripe-webhook] Gift card issued: code=%s store_id=%s', formatGiftCardCode(code), storeId)
}
