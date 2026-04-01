'use server'
import 'server-only'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { XeroAccountCodesSchema } from '@/schemas/xero'

export async function saveXeroSettings(
  input: unknown
): Promise<{ success: boolean; error?: string }> {
  // 1. Validate input with Zod
  const parsed = XeroAccountCodesSchema.safeParse(input)
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors
    const firstError = Object.values(fieldErrors)[0]?.[0] ?? 'Invalid account codes'
    return { success: false, error: firstError }
  }

  // 2. Verify owner auth
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const storeId = user.app_metadata?.store_id as string | undefined
  if (!storeId) {
    return { success: false, error: 'Store not found' }
  }

  // 3. Update xero_connections via admin client
  // Note: cast through any because Supabase generated types don't include xero_connections yet
  // (migration 008 applied but types not regenerated — same pattern as vault.ts and client.ts)
  const adminSupabase = createSupabaseAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminSupabase as any)
    .from('xero_connections')
    .update({
      account_code_cash: parsed.data.cashAccountCode,
      account_code_eftpos: parsed.data.eftposAccountCode,
      account_code_online: parsed.data.onlineAccountCode,
      updated_at: new Date().toISOString(),
    })
    .eq('store_id', storeId)

  if (error) {
    console.error('[saveXeroSettings] Failed to update account codes:', error.message)
    return { success: false, error: 'Failed to save account codes' }
  }

  // 4. Revalidate integrations page
  revalidatePath('/admin/integrations')

  return { success: true }
}
