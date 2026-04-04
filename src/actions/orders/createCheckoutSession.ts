'use server'
import 'server-only'
import { z } from 'zod'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { calcLineItem, calcOrderGST } from '@/lib/gst'

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
})

type CreateCheckoutSessionResult =
  | { url: string }
  | { error: 'out_of_stock'; productName: string }
  | { error: 'invalid_input' }
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

  const { items, promoId, promoDiscountCents = 0, promoDiscountType } = parsed.data

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

  // 10. Create Stripe Checkout Session (server-validated prices, no Stripe Tax)
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    currency: 'nzd',
    line_items: finalCartItems.map((item) => ({
      price_data: {
        currency: 'nzd',
        product_data: { name: item.productName },
        // GST-inclusive line total, already includes discount share
        // quantity factored into lineTotalCents — use qty: 1
        unit_amount: item.lineTotalCents,
      },
      quantity: 1,
    })),
    metadata: {
      order_id: order.id,
      store_id: storeId,
    },
    success_url: `${baseUrl}/order/${order.id}/confirmation?token=${lookupToken}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/`,
  })

  if (!session.url) {
    console.error('[createCheckoutSession] Stripe session created but no URL returned')
    return { error: 'server_error' }
  }

  return { url: session.url }
}
