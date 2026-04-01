'use server'
import 'server-only'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getAuthenticatedXeroClient } from '@/lib/xero/client'
import { deleteXeroTokens } from '@/lib/xero/vault'

export async function disconnectXero(): Promise<{ success: boolean; error?: string }> {
  // 1. Verify owner auth
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const storeId = user.app_metadata?.store_id as string | undefined
  if (!storeId) {
    return { success: false, error: 'Store not found' }
  }

  // 2. Optionally revoke token at Xero (best effort — ignore errors)
  try {
    const xeroClient = await getAuthenticatedXeroClient(storeId)
    if (xeroClient) {
      await xeroClient.xero.revokeToken()
    }
  } catch {
    // Ignore revocation errors — token may already be expired or connection unavailable
  }

  // 3. Delete tokens from Vault
  try {
    await deleteXeroTokens(storeId)
  } catch {
    // Vault delete failure is non-fatal — proceed to update connection status
    console.error('[disconnectXero] Failed to delete vault tokens for store:', storeId)
  }

  // 4. Update xero_connections via admin client
  // Note: cast through unknown because Supabase generated types don't include xero_connections yet
  // (migration 008 applied but types not regenerated — same pattern as vault.ts and client.ts)
  const adminSupabase = createSupabaseAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminSupabase as any)
    .from('xero_connections')
    .update({
      status: 'disconnected',
      account_code_cash: null,
      account_code_eftpos: null,
      account_code_online: null,
      xero_contact_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('store_id', storeId)

  if (error) {
    console.error('[disconnectXero] Failed to update connection status:', error.message)
    return { success: false, error: 'Failed to disconnect Xero' }
  }

  // 5. Revalidate admin layout so banner updates
  revalidatePath('/admin')

  return { success: true }
}
