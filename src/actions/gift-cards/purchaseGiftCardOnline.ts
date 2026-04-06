'use server'
import 'server-only'
import { z } from 'zod'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const PurchaseGiftCardOnlineSchema = z.object({
  storeId: z.string().uuid(),
  denominationCents: z.number().int().positive(),
  buyerEmail: z.string().email(),
})

type PurchaseGiftCardOnlineResult =
  | { url: string }
  | { error: string }

// ---------------------------------------------------------------------------
// Server Action
// ---------------------------------------------------------------------------

/**
 * Initiates a gift card purchase via Stripe Checkout (online storefront).
 *
 * - Validates denomination exists in store's gift_card_denominations JSONB array
 * - Creates a Stripe Checkout Session with metadata.type = 'gift_card'
 * - Webhook (checkout.session.completed) handles actual issuance and email delivery
 * - Never writes to orders or gift_cards tables (issuance is deferred to webhook)
 */
export async function purchaseGiftCardOnline(input: unknown): Promise<PurchaseGiftCardOnlineResult> {
  const parsed = PurchaseGiftCardOnlineSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid input' }
  }

  const { storeId, denominationCents, buyerEmail } = parsed.data
  const supabase = createSupabaseAdminClient()

  // 1. Fetch store and validate denomination exists
  const { data: store } = await supabase
    .from('stores')
    .select('name, gift_card_denominations')
    .eq('id', storeId)
    .single()

  if (!store) {
    return { error: 'Store not found' }
  }

  const denominations: number[] = (store.gift_card_denominations as number[]) ?? []
  if (!denominations.includes(denominationCents)) {
    return { error: 'Invalid denomination' }
  }

  // 2. Check gift cards enabled for this store
  const { data: storePlan } = await supabase
    .from('store_plans')
    .select('has_gift_cards')
    .eq('store_id', storeId)
    .single()

  if (!storePlan?.has_gift_cards) {
    return { error: 'Gift cards are not available at this store' }
  }

  // 3. Determine base URL for redirect URLs
  const headersList = await headers()
  const host = headersList.get('host') ?? ''
  const proto = host.startsWith('localhost') ? 'http' : 'https'
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? `${proto}://${host}`

  // 4. Create Stripe Checkout Session
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      currency: 'nzd',
      line_items: [
        {
          price_data: {
            currency: 'nzd',
            unit_amount: denominationCents,
            product_data: {
              name: `${store.name} Gift Card`,
              description: `Gift card redeemable at ${store.name} in-store or online`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: 'gift_card',
        store_id: storeId,
        denomination_cents: String(denominationCents),
        buyer_email: buyerEmail,
      },
      customer_email: buyerEmail,
      success_url: `${baseUrl}/gift-cards?success=true`,
      cancel_url: `${baseUrl}/gift-cards`,
    })

    if (!session.url) {
      console.error('[purchaseGiftCardOnline] Stripe session created but no URL returned')
      return { error: 'Payment session could not be created. Please try again.' }
    }

    return { url: session.url }
  } catch (err) {
    console.error('[purchaseGiftCardOnline] Stripe error store_id=%s:', storeId, err)
    return { error: 'Payment session could not be created. Please try again.' }
  }
}
