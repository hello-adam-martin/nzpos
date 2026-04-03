import { createServerClient } from '@supabase/ssr'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/types/database'

/**
 * PKCE auth callback for merchant signup email verification.
 * After Supabase sends the verification email, the link lands here.
 * We exchange the code for a session, look up the store slug,
 * then redirect to {slug}.{domain}/admin/dashboard.
 *
 * Uses a custom Supabase client that collects cookies and applies them
 * to the final redirect response (Next.js cookies() API doesn't carry
 * cookies across to NextResponse.redirect).
 *
 * Per D-08: Root-domain callback with subdomain redirect.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/signup?error=verification_failed', request.url))
  }

  // Collect cookies so we can apply them to the redirect response
  const rootDomain = process.env.ROOT_DOMAIN ?? 'lvh.me:3004'
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

  // Exchange PKCE code for session
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
