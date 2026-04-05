'use server'
import 'server-only'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const DeletePromoCodeSchema = z.object({
  id: z.string().uuid(),
})

export async function deletePromoCode(
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

  const parsed = DeletePromoCodeSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const promoId = parsed.data.id

  // Soft-delete: set is_active = false — optimistic lock prevents double-delete
  const { error: dbError } = await supabase
    .from('promo_codes')
    .update({ is_active: false })
    .eq('id', promoId)
    .eq('store_id', storeId)
    .eq('is_active', true)

  if (dbError) {
    return { error: 'Something went wrong. Check your connection and try again.' }
  }

  revalidatePath('/admin/promos')
  return { success: true }
}
