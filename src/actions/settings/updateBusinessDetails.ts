'use server'
import 'server-only'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const UpdateBusinessDetailsSchema = z.object({
  business_address: z.string().max(500).optional().default(''),
  phone: z.string().max(50).optional().default(''),
  ird_gst_number: z.string().max(50).optional().default(''),
})

export async function updateBusinessDetails(
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

  const parsed = UpdateBusinessDetailsSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { error: dbError } = await supabase
    .from('stores')
    .update({
      business_address: parsed.data.business_address || null,
      phone: parsed.data.phone || null,
      ird_gst_number: parsed.data.ird_gst_number || null,
    })
    .eq('id', storeId)

  if (dbError) {
    return { error: "Couldn't save settings. Check your connection and try again." }
  }

  revalidatePath('/admin/settings')
  return { success: true }
}
