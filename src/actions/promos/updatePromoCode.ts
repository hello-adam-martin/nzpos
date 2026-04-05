'use server'
import 'server-only'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const UpdatePromoCodeSchema = z.object({
  id: z.string().uuid(),
  discount_type: z.enum(['percentage', 'fixed']),
  discount_value: z.number().positive(),
  min_order_cents: z.number().int().min(0).optional(),
  max_uses: z.number().int().positive().optional().nullable(),
  expires_at: z.string().datetime().optional().nullable(),
})

export async function updatePromoCode(
  input: unknown,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const role = user?.app_metadata?.role as string | undefined
  const storeId = user?.app_metadata?.store_id as string | undefined

  if (!user || role !== 'owner' || !storeId) {
    return { error: 'Unauthorized' }
  }

  const parsed = UpdatePromoCodeSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { id: promoId, discount_type, discount_value, min_order_cents, max_uses, expires_at } =
    parsed.data

  const { error: dbError } = await supabase
    .from('promo_codes')
    .update({
      discount_type,
      discount_value,
      min_order_cents: min_order_cents ?? 0,
      max_uses: max_uses ?? null,
      expires_at: expires_at ?? null,
    })
    .eq('id', promoId)
    .eq('store_id', storeId)

  if (dbError) {
    return { error: 'Something went wrong. Check your connection and try again.' }
  }

  revalidatePath('/admin/promos')
  return { success: true }
}
