import 'server-only'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { XeroTokenSet } from './types'

/**
 * Reads Xero tokens from Supabase Vault via the get_xero_tokens RPC function.
 * Returns null if no connected Xero connection exists for the store.
 *
 * The RPC function uses SECURITY DEFINER with service_role access to read
 * vault.decrypted_secrets — tokens are never stored in plain DB columns.
 *
 * @param storeId - UUID of the store whose Xero tokens to retrieve
 * @returns XeroTokenSet with access_token, refresh_token, and expires_at, or null if not connected
 */
export async function getXeroTokens(storeId: string): Promise<XeroTokenSet | null> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.rpc('get_xero_tokens', { p_store_id: storeId })

  if (error || !data || data.length === 0) {
    return null
  }

  const row = data[0]
  if (!row.access_token || !row.refresh_token || !row.expires_at) {
    return null
  }

  return {
    access_token: row.access_token,
    refresh_token: row.refresh_token,
    expires_at: row.expires_at,
  }
}

/**
 * Saves Xero tokens to Supabase Vault via the upsert_xero_token RPC function.
 * Creates a new vault secret on first save, updates in-place on subsequent calls.
 *
 * @param storeId - UUID of the store to save tokens for
 * @param tokenSet - Xero OAuth token set including access_token, refresh_token, and expires_at
 * @returns Vault secret ID (UUID string)
 */
export async function saveXeroTokens(storeId: string, tokenSet: XeroTokenSet): Promise<string> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.rpc('upsert_xero_token', {
    p_store_id: storeId,
    p_token_json: JSON.stringify(tokenSet),
  })

  if (error) {
    throw new Error(`Failed to save Xero tokens: ${error.message}`)
  }

  return data as string
}

/**
 * Deletes Xero tokens from Supabase Vault and marks the connection as disconnected.
 * Called during explicit disconnect or after unrecoverable token refresh failure.
 *
 * @param storeId - UUID of the store whose Xero tokens to delete
 * @returns Void — throws on failure
 */
export async function deleteXeroTokens(storeId: string): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.rpc('delete_xero_tokens', { p_store_id: storeId })

  if (error) {
    throw new Error(`Failed to delete Xero tokens: ${error.message}`)
  }
}
