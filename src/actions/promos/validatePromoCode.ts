'use server'
import 'server-only'
import { z } from 'zod'
import { headers } from 'next/headers'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { formatNZD } from '@/lib/money'

// ---------------------------------------------------------------------------
// Zod schema — SEC-08 / F-6.3: runtime validation before any DB access
// ---------------------------------------------------------------------------

const ValidatePromoCodeSchema = z.object({
  code: z.string().min(1).max(50).trim(),
  cartTotalCents: z.number().int().min(0),
})

type ValidatePromoCodeResult =
  | { success: true; promoId: string; discountCents: number; discountType: 'percentage' | 'fixed'; code: string }
  | { error: 'rate_limited'; message: string }
  | { error: 'invalid'; message: string }
  | { error: 'expired'; message: string }
  | { error: 'max_uses'; message: string }
  | { error: 'min_order'; message: string }

export async function validatePromoCode(
  input: unknown
): Promise<ValidatePromoCodeResult> {
  // Validate input before touching the database
  const parsed = ValidatePromoCodeSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'invalid', message: 'That code is invalid or has expired. Double-check the code or contact us for help.' }
  }

  const { code, cartTotalCents } = parsed.data
  const storeId = process.env.STORE_ID!

  // Use admin client — storefront has no authenticated session
  const supabase = createSupabaseAdminClient()

  // Rate limit: 10 validations per minute per IP (via Supabase RPC, persists across instances)
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const { data: allowed } = await supabase.rpc('check_rate_limit', {
    p_ip: ip,
    p_max: 10,
    p_window_seconds: 60,
  })
  if (allowed === false) {
    return { error: 'rate_limited', message: 'Too many attempts. Try again in a moment.' }
  }

  const { data: promo } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('store_id', storeId)
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .single()

  // No matching active promo code
  if (!promo) {
    return {
      error: 'invalid',
      message: 'That code is invalid or has expired. Double-check the code or contact us for help.',
    }
  }

  // Expired
  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    return {
      error: 'expired',
      message: 'That code is invalid or has expired. Double-check the code or contact us for help.',
    }
  }

  // Max uses reached
  if (promo.max_uses !== null && promo.current_uses >= promo.max_uses) {
    return {
      error: 'max_uses',
      message: 'That code is invalid or has expired. Double-check the code or contact us for help.',
    }
  }

  // Minimum order not met
  if (promo.min_order_cents && promo.min_order_cents > 0 && cartTotalCents < promo.min_order_cents) {
    return {
      error: 'min_order',
      message: `Minimum order NZ${formatNZD(promo.min_order_cents)} required.`,
    }
  }

  // Calculate discount
  let discountCents: number
  if (promo.discount_type === 'percentage') {
    discountCents = Math.floor(cartTotalCents * promo.discount_value / 100)
  } else {
    discountCents = promo.discount_value
  }

  // Clamp: discount cannot exceed cart total
  discountCents = Math.min(discountCents, cartTotalCents)

  return {
    success: true,
    promoId: promo.id,
    discountCents,
    discountType: promo.discount_type as 'fixed' | 'percentage',
    code: promo.code,
  }
}
