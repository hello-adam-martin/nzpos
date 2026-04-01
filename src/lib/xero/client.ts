import 'server-only'
import { XeroClient } from 'xero-node'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getXeroTokens, saveXeroTokens } from './vault'

/**
 * Creates an authenticated XeroClient for the given store.
 * Handles pre-call token refresh if the token is within 5 minutes of expiry.
 * Returns null if no Xero connection exists or if token refresh fails.
 *
 * On refresh failure: marks xero_connections.status as 'disconnected' so the
 * admin banner can alert the owner (D-06, XERO-05).
 */
export async function getAuthenticatedXeroClient(
  storeId: string
): Promise<{ xero: XeroClient; tenantId: string } | null> {
  const tokens = await getXeroTokens(storeId)
  if (!tokens) {
    return null
  }

  const xero = new XeroClient({
    clientId: process.env.XERO_CLIENT_ID!,
    clientSecret: process.env.XERO_CLIENT_SECRET!,
    redirectUris: [process.env.XERO_REDIRECT_URI!],
    scopes: [
      'openid',
      'profile',
      'email',
      'accounting.transactions',
      'accounting.settings',
      'offline_access',
    ],
  })

  // Convert ISO string expires_at to epoch seconds (xero-node expects seconds)
  const expiresAtMs = new Date(tokens.expires_at).getTime()
  const expiresAtSeconds = expiresAtMs / 1000

  await xero.setTokenSet({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: expiresAtSeconds,
  })

  // Refresh if within 5 minutes of expiry
  const fiveMinutesMs = 5 * 60 * 1000
  if (Date.now() + fiveMinutesMs >= expiresAtMs) {
    try {
      const refreshed = await xero.refreshToken()
      // Convert refreshed token set back to our format for storage
      // xero-node returns expires_at as epoch seconds
      const newExpiresAt = refreshed.expires_at
        ? new Date(refreshed.expires_at * 1000).toISOString()
        : tokens.expires_at

      await saveXeroTokens(storeId, {
        access_token: refreshed.access_token ?? tokens.access_token,
        refresh_token: refreshed.refresh_token ?? tokens.refresh_token,
        expires_at: newExpiresAt,
      })
    } catch (error) {
      // Token refresh failed — mark connection as disconnected so admin banner shows
      const supabase = createSupabaseAdminClient()
      await supabase
        .from('xero_connections')
        .update({ status: 'disconnected' })
        .eq('store_id', storeId)

      return null
    }
  }

  await xero.updateTenants()

  if (!xero.tenants || xero.tenants.length === 0) {
    return null
  }

  return {
    xero,
    tenantId: xero.tenants[0].tenantId,
  }
}
