'use server'
import 'server-only'
import { resolveAuth } from '@/lib/resolveAuth'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function dismissWizard(): Promise<{ success: true } | { error: string }> {
  const auth = await resolveAuth()
  if (!auth) return { error: 'Unauthorized' }

  const supabase = await createSupabaseServerClient()

  const { error: dbError } = await supabase
    .from('stores')
    .update({ setup_wizard_dismissed: true })
    .eq('id', auth.store_id)

  if (dbError) {
    return { error: dbError.message }
  }

  return { success: true }
}
