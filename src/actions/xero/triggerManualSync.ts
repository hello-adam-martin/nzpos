'use server'
import 'server-only'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { executeManualSync } from '@/lib/xero/sync'

export async function triggerManualSync(): Promise<{
  success: boolean
  message: string
  invoiceNumber?: string
}> {
  // Verify owner auth and extract store_id from JWT claims
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, message: 'Not authenticated' }
  }

  const storeId = user.app_metadata?.store_id as string | undefined
  if (!storeId) {
    return { success: false, message: 'Not authenticated' }
  }

  // Execute manual sync (no retry — owner can manually retry from UI)
  const result = await executeManualSync(storeId)

  // Revalidate integrations page to refresh sync log
  revalidatePath('/admin/integrations')

  return result
}
