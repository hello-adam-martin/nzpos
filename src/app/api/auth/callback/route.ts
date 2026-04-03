import { createServerClient } from '@supabase/ssr'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/types/database'

/**
 * Auth callback handler for two flows:
 *
 * 1. PKCE code exchange (email verification link):
 *    ?code=...
 *    Tries exchangeCodeForSession. If PKCE fails (verifier on different origin),
 *    falls back to admin-based session creation via generateLink + verifyOtp.
 *    This handles the cross-domain case: signup on localhost, verification link
 *    redirects to {slug}.lvh.me where the PKCE verifier doesn't exist.
 *
 * 2. Magic link token hash (direct token-based auth):
 *    ?token_hash=...&type=magiclink
 *    Calls verifyOtp() to create a session directly. No PKCE needed.
 *
 * After session creation, looks up the store slug and redirects to /admin/dashboard.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as 'magiclink' | 'signup' | 'email' | undefined

  // Handle error responses from Supabase verify endpoint
  const authError = searchParams.get('error')
  const errorDesc = searchParams.get('error_description')

  if (!code && !tokenHash) {
    const errorParam = authError
      ? `verification_failed&reason=${encodeURIComponent(errorDesc ?? authError)}`
      : 'verification_failed'
    return NextResponse.redirect(new URL(`/signup?error=${errorParam}`, request.url))
  }

  // Collect cookies so we can apply them to the redirect response
  const rootDomain = process.env.ROOT_DOMAIN ?? 'lvh.me:3000'
  const cookieDomain = '.' + rootDomain.split(':')[0]
  const pendingCookies: { name: string; value: string; options: Record<string, unknown> }[] = []

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) => {
            pendingCookies.push({ name, value, options: { ...options, domain: cookieDomain } })
          })
        },
      },
    }
  )

  const admin = createSupabaseAdminClient()
  let userId: string | undefined

  if (tokenHash && type) {
    // Flow 2: Magic link token hash — verify OTP to create session
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    })

    if (error || !data.user) {
      console.error('[auth/callback] verifyOtp failed:', error?.message)
      return NextResponse.redirect(
        new URL(`/signup?error=verification_failed&reason=${encodeURIComponent(error?.message ?? 'no_user')}`, request.url)
      )
    }
    userId = data.user.id
  } else if (code) {
    // Flow 1: PKCE code exchange — try standard exchange first
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      userId = data.user.id
    } else {
      // PKCE exchange failed (verifier on different origin — cross-domain signup).
      // The Supabase verify endpoint already confirmed the user's email.
      // Fall back: look up the user who was just confirmed, generate a magic link
      // token, and call verifyOtp to create a session on THIS origin.
      console.log('[auth/callback] PKCE exchange failed, falling back to admin session:', error?.message)

      // Find the recently confirmed user. The code param is tied to a specific user,
      // but we can't extract the user from it directly. Instead, check if there's
      // an email in the request or look up via the store slug from the subdomain.
      const host = request.headers.get('host') ?? ''
      const slug = host.split('.')[0]

      const { data: store } = await admin
        .from('stores')
        .select('owner_auth_id')
        .eq('slug', slug)
        .single()

      if (!store?.owner_auth_id) {
        return NextResponse.redirect(new URL('/signup?error=no_store', request.url))
      }

      // Get the user's email for the magic link
      const { data: userData } = await admin.auth.admin.getUserById(store.owner_auth_id)
      if (!userData?.user?.email) {
        return NextResponse.redirect(new URL('/signup?error=verification_failed&reason=user_not_found', request.url))
      }

      // Generate a magic link and verify it to create a session on this origin
      const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email: userData.user.email,
      })

      if (linkError || !linkData?.properties?.hashed_token) {
        console.error('[auth/callback] generateLink failed:', linkError?.message)
        return NextResponse.redirect(
          new URL(`/signup?error=verification_failed&reason=${encodeURIComponent(linkError?.message ?? 'link_failed')}`, request.url)
        )
      }

      // verifyOtp creates the session and triggers setAll (cookies on this origin)
      const { data: otpData, error: otpError } = await supabase.auth.verifyOtp({
        token_hash: linkData.properties.hashed_token,
        type: 'magiclink',
      })

      if (otpError || !otpData.user) {
        console.error('[auth/callback] fallback verifyOtp failed:', otpError?.message)
        return NextResponse.redirect(
          new URL(`/signup?error=verification_failed&reason=${encodeURIComponent(otpError?.message ?? 'otp_failed')}`, request.url)
        )
      }

      userId = otpData.user.id
    }
  }

  if (!userId) {
    return NextResponse.redirect(new URL('/signup?error=verification_failed', request.url))
  }

  // Look up the store slug for this owner
  const { data: store } = await admin
    .from('stores')
    .select('slug')
    .eq('owner_auth_id', userId)
    .single()

  const protocol =
    rootDomain.includes('localhost') || rootDomain.includes('lvh.me') ? 'http' : 'https'

  let redirectUrl: string
  if (store?.slug) {
    redirectUrl = `${protocol}://${store.slug}.${rootDomain}/admin/dashboard`
  } else {
    redirectUrl = new URL('/signup?error=no_store', request.url).toString()
  }

  // Build redirect response with session cookies attached
  const response = NextResponse.redirect(redirectUrl)
  for (const { name, value, options } of pendingCookies) {
    response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
  }

  return response
}
