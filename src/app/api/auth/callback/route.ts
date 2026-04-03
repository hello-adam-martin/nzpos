import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

/**
 * PKCE auth callback for merchant signup email verification.
 * After Supabase sends the verification email, the link lands here.
 * We exchange the code for a session, look up the store slug,
 * then redirect to {slug}.{domain}/admin/dashboard.
 *
 * Per D-08: Root-domain callback with subdomain redirect.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/signup?error=verification_failed', request.url))
  }

  // Exchange PKCE code for session
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    return NextResponse.redirect(new URL('/signup?error=verification_failed', request.url))
  }

  // Look up the store slug for this owner
  const admin = createSupabaseAdminClient()
  const { data: store } = await admin
    .from('stores')
    .select('slug')
    .eq('owner_auth_id', data.user.id)
    .single()

  if (store?.slug) {
    const rootDomain = process.env.ROOT_DOMAIN ?? 'lvh.me:3000'
    const protocol =
      rootDomain.includes('localhost') || rootDomain.includes('lvh.me') ? 'http' : 'https'
    return NextResponse.redirect(`${protocol}://${store.slug}.${rootDomain}/admin/dashboard`)
  }

  // Edge case: user verified but store was never provisioned
  return NextResponse.redirect(new URL('/signup?error=no_store', request.url))
}
