'use server'
import 'server-only'
import { z } from 'zod'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { calcLineItem, calcOrderGST } from '@/lib/gst'
import { normalizeGiftCardCode, effectiveGiftCardStatus } from '@/lib/gift-card-utils'
import { sendEmail } from '@/lib/email'
import { OnlineReceiptEmail } from '@/emails/OnlineReceiptEmail'
import type { ReceiptData } from '@/lib/receipt'

// ---------------------------------------------------------------------------
// Zod schema — SEC-08 / F-6.1: runtime validation before any DB access
// ---------------------------------------------------------------------------

const CheckoutItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive().max(999),
})

const CreateCheckoutSessionSchema = z.object({
  items: z.array(CheckoutItemSchema).min(1).max(100),
  promoId: z.string().uuid().optional(),
  promoDiscountCents: z.number().int().min(0).optional(),
  promoDiscountType: z.enum(['percentage', 'fixed']).optional(),
  // Gift card fields (optional — D-11, D-12)
  giftCardCode: z
    .string()
    .transform((s) => normalizeGiftCardCode(s))
    .optional(),
  giftCardAmountCents: z.number().int().positive().optional(),
})

type CreateCheckoutSessionResult =
  | { url: string }
  | { redirect: string }
  | { error: 'out_of_stock'; productName: string }
  | { error: 'invalid_input' }
  | { error: 'gift_card_invalid' }
  | { error: 'server_error' }

// ---------------------------------------------------------------------------
// Server Action
// ---------------------------------------------------------------------------

export async function createCheckoutSession(
  input: unknown
): Promise<CreateCheckoutSessionResult> {
  // Validate all user-supplied input before touching the database
  const parsed = CreateCheckoutSessionSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'invalid_input' }
  }

  const headersList = await headers()
  const storeId = headersList.get('x-store-id') ?? process.env.STORE_ID!
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!

  const {
    items,
    promoId,
    promoDiscountCents = 0,
    promoDiscountType,
    giftCardCode,
    giftCardAmountCents,
  } = parsed.data

  const supabase = createSupabaseAdminClient()

  // 1. Re-fetch product prices from DB — NEVER trust client prices
  const productIds = items.map((i) => i.productId)
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name, price_cents, stock_quantity, is_active')
    .eq('store_id', storeId)
    .in('id', productIds)
    .eq('is_active', true)

  if (productsError || !products) {
    console.error('[createCheckoutSession] Failed to fetch products:', productsError?.message)
    return { error: 'server_error' }
  }

  // Check if this store has inventory tracking enabled
  const { data: storePlan } = await supabase
    .from('store_plans')
    .select('has_inventory')
    .eq('store_id', storeId)
    .single()
  const hasInventory = storePlan?.has_inventory === true

  // Build a lookup map
  const productMap = new Map(products.map((p) => [p.id, p]))

  // 2. Validate all items exist and have sufficient stock
  for (const item of items) {
    const product = productMap.get(item.productId)
    if (!product) {
      return { error: 'out_of_stock' as const, productName: 'Unknown product' }
    }
    // Only check stock when inventory add-on is active
    if (hasInventory && product.stock_quantity < item.quantity) {
      return { error: 'out_of_stock' as const, productName: product.name }
    }
  }

  // 3. Build cart with server-verified prices and GST
  // Compute subtotal before discount
  const cartItems = items.map((item) => {
    const product = productMap.get(item.productId)!
    const lineTotal = product.price_cents * item.quantity
    return {
      productId: item.productId,
      productName: product.name,
      unitPriceCents: product.price_cents,
      quantity: item.quantity,
      lineTotalBeforeDiscount: lineTotal,
    }
  })

  const subtotalBeforeDiscount = cartItems.reduce(
    (sum, item) => sum + item.lineTotalBeforeDiscount,
    0
  )

  // 4. If promo provided: re-validate from DB (double-check expiry/uses/active)
  let appliedDiscountCents = 0
  let verifiedPromoId: string | undefined

  if (promoId) {
    const { data: promo } = await supabase
      .from('promo_codes')
      .select('id, is_active, expires_at, max_uses, current_uses, discount_type, discount_value')
      .eq('id', promoId)
      .eq('store_id', storeId)
      .single()

    const promoValid =
      promo &&
      promo.is_active &&
      (!promo.expires_at || new Date(promo.expires_at) >= new Date()) &&
      (promo.max_uses === null || promo.current_uses < promo.max_uses)

    if (promoValid) {
      // Recalculate discount server-side — NEVER trust client promoDiscountCents
      let computedDiscount: number
      if (promo.discount_type === 'percentage') {
        computedDiscount = Math.floor(subtotalBeforeDiscount * promo.discount_value / 100)
      } else {
        computedDiscount = promo.discount_value
      }
      appliedDiscountCents = Math.min(computedDiscount, subtotalBeforeDiscount)
      verifiedPromoId = promo.id
    }
  }

  // 5. Distribute discount pro-rata across lines (Math.floor for all, last absorbs remainder)
  const lineDiscounts: number[] = new Array(cartItems.length).fill(0)
  if (appliedDiscountCents > 0 && subtotalBeforeDiscount > 0) {
    let allocated = 0
    for (let i = 0; i < cartItems.length; i++) {
      if (i === cartItems.length - 1) {
        lineDiscounts[i] = appliedDiscountCents - allocated
      } else {
        const share = Math.floor(
          (cartItems[i].lineTotalBeforeDiscount / subtotalBeforeDiscount) * appliedDiscountCents
        )
        lineDiscounts[i] = share
        allocated += share
      }
    }
  }

  // 6. Calculate per-line totals and GST after discount
  const lineGSTs: number[] = []
  const finalCartItems = cartItems.map((item, i) => {
    const { lineTotal, gst } = calcLineItem(
      item.unitPriceCents,
      item.quantity,
      lineDiscounts[i]
    )
    lineGSTs.push(gst)
    return {
      ...item,
      discountShareCents: lineDiscounts[i],
      lineTotalCents: lineTotal,
      gstCents: gst,
    }
  })

  const totalCents = finalCartItems.reduce((sum, item) => sum + item.lineTotalCents, 0)
  const gstCents = calcOrderGST(lineGSTs)
  const totalDiscountCents = appliedDiscountCents

  // ---------------------------------------------------------------------------
  // Gift card validation (D-11, D-12, Research Pattern 5)
  // ---------------------------------------------------------------------------

  let verifiedGiftCardId: string | undefined
  let verifiedGiftCardAmountCents = 0

  if (giftCardCode && giftCardAmountCents) {
    // Re-validate gift card from DB (NEVER trust client-side state)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: card } = await (supabase as any)
      .from('gift_cards')
      .select('id, balance_cents, status, expires_at')
      .eq('store_id', storeId)
      .eq('code', giftCardCode)
      .maybeSingle() as {
        data: {
          id: string
          balance_cents: number
          status: 'active' | 'redeemed' | 'expired' | 'voided'
          expires_at: string
        } | null
      }

    if (!card) {
      return { error: 'gift_card_invalid' }
    }

    const effective = effectiveGiftCardStatus(
      card.status as 'active' | 'redeemed' | 'expired' | 'voided',
      card.expires_at
    )

    if (effective !== 'active') {
      return { error: 'gift_card_invalid' }
    }

    if (card.balance_cents <= 0) {
      return { error: 'gift_card_invalid' }
    }

    // Server-computed amounts — NEVER trust client giftCardAmountCents
    const serverGiftCardAmount = Math.min(card.balance_cents, totalCents)

    verifiedGiftCardId = card.id
    verifiedGiftCardAmountCents = serverGiftCardAmount
  }

  // ---------------------------------------------------------------------------
  // Gift card full-cover path (D-12) — bypass Stripe entirely
  // ---------------------------------------------------------------------------

  if (verifiedGiftCardId && verifiedGiftCardAmountCents >= totalCents) {
    return handleFullGiftCardCover({
      supabase,
      storeId,
      baseUrl,
      finalCartItems,
      totalCents,
      gstCents,
      totalDiscountCents,
      subtotalBeforeDiscount,
      verifiedPromoId,
      verifiedGiftCardId,
      verifiedGiftCardAmountCents: totalCents, // cap at actual total
    })
  }

  // 7. Create PENDING order record with lookup token for IDOR protection
  const lookupToken = crypto.randomUUID()
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      store_id: storeId,
      channel: 'online',
      status: 'pending',
      subtotal_cents: subtotalBeforeDiscount,
      gst_cents: gstCents,
      total_cents: totalCents,
      discount_cents: totalDiscountCents,
      payment_method: 'stripe',
      lookup_token: lookupToken,
      promo_id: verifiedPromoId ?? null,
    } as any)
    .select('id')
    .single()

  if (orderError || !order) {
    console.error('[createCheckoutSession] Failed to create order:', orderError?.message)
    return { error: 'server_error' }
  }

  // 8. CRITICAL: Insert order_items for each cart item (required for complete_online_sale stock decrement)
  const orderItemsData = finalCartItems.map((item) => ({
    order_id: order.id,
    store_id: storeId,
    product_id: item.productId,
    product_name: item.productName,
    unit_price_cents: item.unitPriceCents,
    quantity: item.quantity,
    discount_cents: item.discountShareCents,
    line_total_cents: item.lineTotalCents,
    gst_cents: item.gstCents,
  }))

  const { error: itemsError } = await supabase.from('order_items').insert(orderItemsData)
  if (itemsError) {
    console.error('[createCheckoutSession] Failed to insert order_items:', itemsError.message)
    // Clean up orphan order
    await supabase.from('orders').delete().eq('id', order.id)
    return { error: 'server_error' }
  }

  // 9. Promo uses are incremented in the Stripe webhook after payment completes (not here)

  // ---------------------------------------------------------------------------
  // Gift card partial-cover path — create Stripe session for the remainder only.
  // CRITICAL: Do NOT deduct gift card balance here (Pitfall 1 — wait for webhook).
  // The gift card deduction is expressed as a negative line item in Stripe.
  // ---------------------------------------------------------------------------

  // 10. Create Stripe Checkout Session (server-validated prices, no Stripe Tax)
  //
  // Partial gift card path: represent all items individually + add a negative "Gift Card" line
  // to reduce the Stripe-charged amount to the remainder only.
  const stripeLineItems = [
    ...finalCartItems.map((item) => ({
      price_data: {
        currency: 'nzd',
        product_data: { name: item.productName },
        // GST-inclusive line total, already includes discount share
        // quantity factored into lineTotalCents — use qty: 1
        unit_amount: item.lineTotalCents,
      },
      quantity: 1 as const,
    })),
    // Add gift card deduction as a negative line item (partial cover only)
    ...(verifiedGiftCardId && verifiedGiftCardAmountCents > 0
      ? [
          {
            price_data: {
              currency: 'nzd',
              product_data: { name: 'Gift Card Applied' },
              unit_amount: -verifiedGiftCardAmountCents,
            },
            quantity: 1 as const,
          },
        ]
      : []),
  ]

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    currency: 'nzd',
    line_items: stripeLineItems,
    metadata: {
      order_id: order.id,
      store_id: storeId,
      // Gift card partial payment — deduction happens in webhook (Pitfall 1)
      ...(verifiedGiftCardId && verifiedGiftCardAmountCents > 0
        ? {
            gift_card_code: giftCardCode!,
            gift_card_amount_cents: String(verifiedGiftCardAmountCents),
          }
        : {}),
    },
    success_url: `${baseUrl}/order/${order.id}/confirmation?token=${lookupToken}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/`,
  })

  if (!session.url) {
    console.error('[createCheckoutSession] Stripe session created but no URL returned')
    return { error: 'server_error' }
  }

  // Log partial gift card info for debugging
  if (verifiedGiftCardId) {
    console.log(
      '[createCheckoutSession] Partial gift card: gift_card_id=%s amount=%d order_id=%s',
      verifiedGiftCardId,
      verifiedGiftCardAmountCents,
      order.id
    )
  }

  return { url: session.url }
}

// ---------------------------------------------------------------------------
// Full gift card cover — bypass Stripe, complete order server-side (D-12)
// ---------------------------------------------------------------------------

async function handleFullGiftCardCover({
  supabase,
  storeId,
  baseUrl,
  finalCartItems,
  totalCents,
  gstCents,
  totalDiscountCents,
  subtotalBeforeDiscount,
  verifiedPromoId,
  verifiedGiftCardId,
  verifiedGiftCardAmountCents,
}: {
  supabase: ReturnType<typeof createSupabaseAdminClient>
  storeId: string
  baseUrl: string
  finalCartItems: Array<{
    productId: string
    productName: string
    unitPriceCents: number
    quantity: number
    discountShareCents: number
    lineTotalCents: number
    gstCents: number
  }>
  totalCents: number
  gstCents: number
  totalDiscountCents: number
  subtotalBeforeDiscount: number
  verifiedPromoId: string | undefined
  verifiedGiftCardId: string
  verifiedGiftCardAmountCents: number
}): Promise<CreateCheckoutSessionResult> {
  // Create the order with status 'pending' first (complete_online_sale updates to 'completed')
  const lookupToken = crypto.randomUUID()
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      store_id: storeId,
      channel: 'online',
      status: 'pending',
      subtotal_cents: subtotalBeforeDiscount,
      gst_cents: gstCents,
      total_cents: totalCents,
      discount_cents: totalDiscountCents,
      payment_method: 'gift_card',
      lookup_token: lookupToken,
      promo_id: verifiedPromoId ?? null,
    } as any)
    .select('id')
    .single()

  if (orderError || !order) {
    console.error('[createCheckoutSession] Full-cover: failed to create order:', orderError?.message)
    return { error: 'server_error' }
  }

  // Insert order_items (required for complete_online_sale stock decrement)
  const orderItemsData = finalCartItems.map((item) => ({
    order_id: order.id,
    store_id: storeId,
    product_id: item.productId,
    product_name: item.productName,
    unit_price_cents: item.unitPriceCents,
    quantity: item.quantity,
    discount_cents: item.discountShareCents,
    line_total_cents: item.lineTotalCents,
    gst_cents: item.gstCents,
  }))

  const { error: itemsError } = await supabase.from('order_items').insert(orderItemsData)
  if (itemsError) {
    console.error('[createCheckoutSession] Full-cover: failed to insert order_items:', itemsError.message)
    await supabase.from('orders').delete().eq('id', order.id)
    return { error: 'server_error' }
  }

  // Call complete_online_sale RPC: atomically updates order status and decrements stock.
  // Uses placeholder stripe_session_id since there's no Stripe session for full-cover gift card.
  const { error: saleError } = await supabase.rpc('complete_online_sale', {
    p_store_id: storeId,
    p_order_id: order.id,
    p_stripe_session_id: `gift_card_${order.id}`,
    p_stripe_payment_intent_id: '', // No Stripe payment_intent for gift card full-cover
    p_customer_email: undefined,
    p_items: finalCartItems.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
    })),
  })

  if (saleError) {
    console.error('[createCheckoutSession] Full-cover: complete_online_sale RPC error:', saleError.message)
    return { error: 'server_error' }
  }

  // Redeem gift card (after order is committed — order atomicity preserved)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: redemptionError } = await (supabase as any).rpc('redeem_gift_card', {
    p_store_id: storeId,
    p_gift_card_id: verifiedGiftCardId,
    p_amount_cents: verifiedGiftCardAmountCents,
    p_channel: 'online',
    p_order_id: order.id,
    p_staff_id: null,
  })

  if (redemptionError) {
    console.warn(
      '[createCheckoutSession] Full-cover: gift card redemption warning store_id=%s order_id=%s:',
      storeId,
      order.id,
      redemptionError
    )
    // Order is already completed — log warning but don't fail (matches webhook pattern)
  }

  // Send order confirmation email (same template as webhook — fire-and-forget)
  void sendConfirmationEmail({ supabase, storeId, orderId: order.id })

  console.log(
    '[createCheckoutSession] Full-cover gift card: gift_card_id=%s order_id=%s',
    verifiedGiftCardId,
    order.id
  )

  // Redirect to confirmation page (matches webhook success_url pattern)
  return { redirect: `/order/${order.id}/confirmation?token=${lookupToken}` }
}

// ---------------------------------------------------------------------------
// Send order confirmation email (replicates webhook logic — fire-and-forget)
// ---------------------------------------------------------------------------

async function sendConfirmationEmail({
  supabase,
  storeId,
  orderId,
}: {
  supabase: ReturnType<typeof createSupabaseAdminClient>
  storeId: string
  orderId: string
}): Promise<void> {
  try {
    const { data: orderData } = await supabase
      .from('orders')
      .select('id, total_cents, created_at, receipt_data, customer_email')
      .eq('id', orderId)
      .single()

    const customerEmail = orderData?.customer_email
    if (!customerEmail) return

    if (orderData?.receipt_data) {
      const receipt = orderData.receipt_data as ReceiptData
      void sendEmail({
        to: customerEmail,
        subject: `Your receipt from ${receipt.storeName}`,
        react: OnlineReceiptEmail({ receipt }),
      })
      return
    }

    // Fallback: build receipt from order_items + store
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
      const receiptItems = fullItems.map((item) => ({
        productId: item.product_id,
        productName: (item.products as { name: string } | null)?.name ?? 'Unknown',
        quantity: item.quantity,
        unitPriceCents: item.unit_price_cents,
        discountCents: item.discount_cents ?? 0,
        lineTotalCents: item.line_total_cents,
        gstCents: Math.round(item.line_total_cents * 3 / 23),
      }))

      const totalCents = orderData?.total_cents ?? receiptItems.reduce((s, i) => s + i.lineTotalCents, 0)
      const gstCents = Math.round(totalCents * 3 / 23)

      const receipt: ReceiptData = {
        orderId,
        storeName: store.name,
        storeAddress: store.address ?? '',
        storePhone: store.phone ?? '',
        gstNumber: store.gst_number ?? '',
        completedAt: orderData?.created_at ?? new Date().toISOString(),
        staffName: 'Online',
        items: receiptItems,
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
  } catch (err) {
    console.error('[createCheckoutSession] sendConfirmationEmail error:', err)
  }
}
