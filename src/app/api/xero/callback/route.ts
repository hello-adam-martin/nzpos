import { NextRequest } from 'next/server'
import { XeroClient } from 'xero-node'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { saveXeroTokens } from '@/lib/xero/vault'

export async function GET(request: NextRequest) {
  try {
    // 1. Verify user is authenticated
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.redirect(new URL('/admin/integrations?error=not_authenticated', request.url))
    }

    const storeId = user.app_metadata?.store_id as string | undefined
    if (!storeId) {
      return Response.redirect(new URL('/admin/integrations?error=not_authenticated', request.url))
    }

    // 2. Create XeroClient and exchange authorization code for tokens
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

    const tokenSet = await xero.apiCallback(request.url)
    await xero.updateTenants()

    if (!xero.tenants || xero.tenants.length === 0) {
      return Response.redirect(new URL('/admin/integrations?error=oauth_failed', request.url))
    }

    const tenantId = xero.tenants[0].tenantId
    const tenantName = xero.tenants[0].tenantName ?? null

    // 3. Build token JSON and store in Vault
    const expiresAt = tokenSet.expires_at
      ? new Date(tokenSet.expires_at * 1000).toISOString()
      : new Date(Date.now() + 30 * 60 * 1000).toISOString() // fallback: 30 minutes

    const tokenJson = {
      access_token: tokenSet.access_token!,
      refresh_token: tokenSet.refresh_token!,
      expires_at: expiresAt,
    }

    const secretId = await saveXeroTokens(storeId, tokenJson)

    // 4. Create or find Xero Contact "NZPOS Daily Sales"
    let contactId: string | null = null
    try {
      const existingContacts = await xero.accountingApi.getContacts(
        tenantId,
        undefined, // ifModifiedSince
        'Name=="NZPOS Daily Sales"'
      )

      if (existingContacts.body.contacts && existingContacts.body.contacts.length > 0) {
        contactId = existingContacts.body.contacts[0].contactID ?? null
      } else {
        const created = await xero.accountingApi.createContacts(tenantId, {
          contacts: [{ name: 'NZPOS Daily Sales' }],
        })
        contactId = created.body.contacts?.[0]?.contactID ?? null
      }
    } catch {
      // Contact creation failure is non-fatal — sync can still proceed
      console.error('[xero/callback] Failed to create/find NZPOS Daily Sales contact')
    }

    // 5. Upsert xero_connections row via admin client
    // Note: cast through any because Supabase generated types don't include xero_connections yet
    // (migration 008 applied but types not regenerated — same pattern as vault.ts and client.ts)
    const adminSupabase = createSupabaseAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: upsertError } = await (adminSupabase as any)
      .from('xero_connections')
      .upsert(
        {
          store_id: storeId,
          tenant_id: tenantId,
          tenant_name: tenantName,
          vault_secret_id: secretId,
          status: 'connected',
          xero_contact_id: contactId,
          connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'store_id' }
      )

    if (upsertError) {
      console.error('[xero/callback] Failed to upsert xero_connections:', upsertError.message)
      return Response.redirect(new URL('/admin/integrations?error=oauth_failed', request.url))
    }

    return Response.redirect(new URL('/admin/integrations?connected=true', request.url))
  } catch (error) {
    console.error('[xero/callback] OAuth flow failed:', error)
    return Response.redirect(new URL('/admin/integrations?error=oauth_failed', request.url))
  }
}
