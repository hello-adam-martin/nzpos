'use server'
import 'server-only'
import { headers } from 'next/headers'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rateLimit'
import { formatNZD } from '@/lib/money'

interface ValidatePromoCodeInput {
  code: string
  cartTotalCents: number
  storeId: string
}

type ValidatePromoCodeResult =
  | { success: true; promoId: string; discountCents: number; discountType: 'percentage' | 'fixed'; code: string }
  | { error: 'rate_limited'; message: string }
  | { error: 'invalid'; message: string }
  | { error: 'expired'; message: string }
  | { error: 'max_uses'; message: string }
  | { error: 'min_order'; message: string }

export async function validatePromoCode(
  input: ValidatePromoCodeInput
): Promise<ValidatePromoCodeResult> {
  // Rate limit: 10 validations per minute per IP
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!checkRateLimit(ip, 10)) {
    return { error: 'rate_limited', message: 'Too many attempts. Try again in a moment.' }
  }

  const { code, cartTotalCents, storeId } = input

  // Use admin client — storefront has no authenticated session
  const supabase = createSupabaseAdminClient()

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
  if (promo.min_order_cents > 0 && cartTotalCents < promo.min_order_cents) {
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
    discountType: promo.discount_type,
    code: promo.code,
  }
}
