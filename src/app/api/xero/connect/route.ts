import { NextRequest } from 'next/server'
import { XeroClient } from 'xero-node'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  // Verify owner is authenticated before initiating OAuth
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.redirect(new URL('/admin/integrations?error=not_authenticated', request.url))
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

  const consentUrl = await xero.buildConsentUrl()
  return Response.redirect(consentUrl)
}
