'use server'
import 'server-only'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const UpdateReceiptSettingsSchema = z.object({
  receipt_header: z.string().max(500).optional().default(''),
  receipt_footer: z.string().max(500).optional().default(''),
})

export async function updateReceiptSettings(
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

  const parsed = UpdateReceiptSettingsSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { error: dbError } = await supabase
    .from('stores')
    .update({
      receipt_header: parsed.data.receipt_header || null,
      receipt_footer: parsed.data.receipt_footer || null,
    })
    .eq('id', storeId)

  if (dbError) {
    return { error: "Couldn't save settings. Check your connection and try again." }
  }

  revalidatePath('/admin/settings')
  return { success: true }
}
