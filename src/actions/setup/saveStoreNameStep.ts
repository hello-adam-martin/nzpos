'use server'
import 'server-only'
import { z } from 'zod'
import { resolveAuth } from '@/lib/resolveAuth'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const SaveStoreNameSchema = z.object({
  storeName: z.string().min(1, 'Store name is required').max(100, 'Store name must be 100 characters or fewer'),
})

export async function saveStoreNameStep(input: { storeName: string }): Promise<{ success: true } | { error: string }> {
  const auth = await resolveAuth()
  if (!auth) return { error: 'Unauthorized' }

  const parsed = SaveStoreNameSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createSupabaseServerClient()

  // Read current setup_completed_steps to OR with bit 0
  const { data: current } = await supabase
    .from('stores')
    .select('setup_completed_steps')
    .eq('id', auth.store_id)
    .single()

  const currentSteps = current?.setup_completed_steps ?? 0
  const newSteps = currentSteps | 1 // set bit 0

  const { error: dbError } = await supabase
    .from('stores')
    .update({
      name: parsed.data.storeName,
      setup_completed_steps: newSteps,
    })
    .eq('id', auth.store_id)

  if (dbError) {
    return { error: dbError.message }
  }

  return { success: true }
}
