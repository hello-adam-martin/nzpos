'use server'
import 'server-only'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { CreatePromoCodeSchema } from '@/schemas/order'

export async function createPromoCode(input: unknown) {
  const supabase = await createSupabaseServerClient()

  // Verify auth and extract store_id from JWT app_metadata
  const { data: { user } } = await supabase.auth.getUser()
  const storeId = user?.app_metadata?.store_id as string | undefined
  if (!storeId) {
    return { error: { _form: ['Not authenticated'] } }
  }

  // Validate input with Zod schema
  const parsed = CreatePromoCodeSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  const { error: dbError } = await supabase
    .from('promo_codes')
    .insert({
      store_id: storeId,
      code: parsed.data.code,
      discount_type: parsed.data.discount_type,
      discount_value: parsed.data.discount_value,
      min_order_cents: parsed.data.min_order_cents,
      max_uses: parsed.data.max_uses ?? null,
      expires_at: parsed.data.expires_at ?? null,
    })

  if (dbError) {
    // Unique constraint violation on (store_id, code)
    if (dbError.code === '23505') {
      return { error: { code: ['A promo code with this name already exists'] } }
    }
    return { error: { _form: [dbError.message] } }
  }

  revalidatePath('/admin/promos')
  return { success: true }
}
