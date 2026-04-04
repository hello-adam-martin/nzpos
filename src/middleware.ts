import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseMiddlewareClient } from '@/lib/supabase/middleware'
import { createMiddlewareAdminClient } from '@/lib/supabase/middlewareAdmin'
import { getCachedStoreId, setCachedStoreId } from '@/lib/tenantCache'
import { jwtVerify } from 'jose'

const staffSecret = new TextEncoder().encode(process.env.STAFF_JWT_SECRET!)

// Security headers — Phase 17 SEC-12
// CSP is Report-Only first (D-06). Switch to enforcing after validation in production.
function addSecurityHeaders(response: NextResponse): NextResponse {
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://js.stripe.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.supabase.co",
    "connect-src 'self' https://*.supabase.co https://api.stripe.com wss://*.supabase.co",
    "frame-src https://js.stripe.com https://hooks.stripe.com",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  response.headers.set('Content-Security-Policy-Report-Only', cspDirectives)
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  // Note: Strict-Transport-Security is handled by Vercel at the edge
  return response
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Webhook routes — no auth, no tenant resolution
  // Webhooks receive raw bodies and must not be modified; security headers still applied.
  if (pathname.startsWith('/api/webhooks')) {
    return addSecurityHeaders(NextResponse.next())
  }

  // 2. Determine if this is the root domain or a store subdomain
  const host = request.headers.get('host') ?? ''
  const rootDomain = process.env.ROOT_DOMAIN ?? 'lvh.me:3000'
  const isRoot = host === rootDomain || host === `www.${rootDomain}` || host.startsWith('localhost') || host.startsWith('127.0.0.1')

  // 2.5. Super admin routes on root domain — auth check + pass through (per D-01, D-02)
  if (isRoot && pathname.startsWith('/super-admin')) {
    const { supabase, response } = await createSupabaseMiddlewareClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return addSecurityHeaders(NextResponse.redirect(loginUrl))
    }

    const isSuperAdmin = user.app_metadata?.is_super_admin === true
    if (!isSuperAdmin) {
      return addSecurityHeaders(NextResponse.redirect(new URL('/unauthorized', request.url)))
    }

    return addSecurityHeaders(response)
  }

  // 3. Root domain — marketing site (per D-05). Pass through with session refresh.
  if (isRoot) {
    const { response } = await createSupabaseMiddlewareClient(request)
    return addSecurityHeaders(response)
  }

  // 4. Subdomain — extract slug and resolve store_id (per D-01)
  const slug = host.split('.')[0]
  const cached = getCachedStoreId(slug)
  let storeId: string

  if (cached) {
    storeId = cached
    // Verify store is still active even when cached (suspension enforcement)
    const adminClient = createMiddlewareAdminClient()
    const { data: activeCheck } = await adminClient
      .from('stores')
      .select('is_active')
      .eq('id', storeId)
      .single()
    if (activeCheck && !activeCheck.is_active) {
      return addSecurityHeaders(NextResponse.rewrite(new URL('/suspended', request.url)))
    }
  } else {
    const admin = createMiddlewareAdminClient()
    const { data } = await admin
      .from('stores')
      .select('id, is_active')
      .eq('slug', slug)
      .single()

    if (!data) {
      // Unknown subdomain — 404 (per D-03)
      return addSecurityHeaders(NextResponse.rewrite(new URL('/not-found', request.url)))
    }
    if (!data.is_active) {
      // Suspended store — show branded suspension page (per D-09)
      return addSecurityHeaders(NextResponse.rewrite(new URL('/suspended', request.url)))
    }
    storeId = data.id
    setCachedStoreId(slug, storeId)
  }

  // 5. Prepare tenant headers for downstream consumption
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-store-id', storeId)
  requestHeaders.set('x-store-slug', slug)

  // 6. Admin routes — owner only (Supabase Auth) — PRESERVED from original
  if (pathname.startsWith('/admin')) {
    const { supabase, response } = await createSupabaseMiddlewareClient(request)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return addSecurityHeaders(NextResponse.redirect(loginUrl))
    }

    // D-07: Email verification gate — unverified owners cannot access admin
    const emailVerified = user.email_confirmed_at != null
    if (!emailVerified) {
      const rootDomain = process.env.ROOT_DOMAIN ?? 'lvh.me:3000'
      const protocol =
        rootDomain.includes('localhost') || rootDomain.includes('lvh.me') ? 'http' : 'https'
      const verifyUrl = new URL(`${protocol}://${rootDomain}/signup/verify-email`)
      verifyUrl.searchParams.set('email', user.email ?? '')
      return addSecurityHeaders(NextResponse.redirect(verifyUrl))
    }

    let {
      data: { session },
    } = await supabase.auth.getSession()
    let role = session?.user?.app_metadata?.role

    // If role is missing from JWT, force a token refresh to pick up app_metadata
    // set by ownerSignup (role + store_id). This handles the first admin visit
    // after signup where the initial JWT predates the provisioning step.
    if (!role && session) {
      const { data: refreshed } = await supabase.auth.refreshSession()
      if (refreshed.session) {
        session = refreshed.session
        role = session.user?.app_metadata?.role
      }
    }

    // D-10: Block customer role from admin routes — silent redirect to storefront
    if (role === 'customer') {
      return addSecurityHeaders(NextResponse.redirect(new URL('/', request.url)))
    }
    if (role !== 'owner') {
      return addSecurityHeaders(NextResponse.redirect(new URL('/unauthorized', request.url)))
    }

    // D-01: Setup wizard redirect — first admin visit goes to /admin/setup
    // Excludes /admin/setup itself (loop prevention) and /admin/settings (accessible pre-wizard)
    if (!pathname.startsWith('/admin/setup') && !pathname.startsWith('/admin/settings')) {
      const adminClient = createMiddlewareAdminClient()
      const { data: storeCheck } = await adminClient
        .from('stores')
        .select('setup_wizard_dismissed')
        .eq('id', storeId)
        .single()

      if (storeCheck && !storeCheck.setup_wizard_dismissed) {
        return addSecurityHeaders(NextResponse.redirect(new URL('/admin/setup', request.url)))
      }
    }

    // Inject tenant headers into the response for downstream Server Components
    response.headers.set('x-store-id', storeId)
    response.headers.set('x-store-slug', slug)
    return addSecurityHeaders(response)
  }

  // 7. POS login — pass through with tenant headers (PRESERVED)
  if (pathname === '/pos/login') {
    return addSecurityHeaders(NextResponse.next({
      request: { headers: requestHeaders },
    }))
  }

  // 8. POS routes — staff or owner (PRESERVED)
  if (pathname.startsWith('/pos')) {
    // D-10: Block customer role from POS routes — silent redirect to storefront
    const { supabase: posSupabase } = await createSupabaseMiddlewareClient(request)
    const {
      data: { user: posUser },
    } = await posSupabase.auth.getUser()
    if (posUser?.app_metadata?.role === 'customer') {
      return addSecurityHeaders(NextResponse.redirect(new URL('/', request.url)))
    }

    const staffToken = request.cookies.get('staff_session')?.value
    if (staffToken) {
      try {
        const { payload } = await jwtVerify(staffToken, staffSecret)
        if (payload.role === 'staff' || payload.role === 'owner') {
          return addSecurityHeaders(NextResponse.next({
            request: { headers: requestHeaders },
          }))
        }
      } catch {
        // Token expired/invalid — fall through
      }
    }

    // Check Supabase Auth owner session
    const { supabase, response } = await createSupabaseMiddlewareClient(request)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session?.user?.app_metadata?.role === 'owner') {
        response.headers.set('x-store-id', storeId)
        response.headers.set('x-store-slug', slug)
        return addSecurityHeaders(response)
      }
    }

    return addSecurityHeaders(NextResponse.redirect(new URL('/pos/login', request.url)))
  }

  // 9. Storefront routes — public, refresh session if present (PRESERVED)
  // Rewrite root "/" on subdomains to the (store) route group's page.
  // Without this, src/app/page.tsx (marketing) takes precedence over (store)/page.tsx.
  if (pathname === '/') {
    const storeUrl = new URL('/storefront', request.url)
    storeUrl.search = request.nextUrl.search
    const rewriteResponse = NextResponse.rewrite(storeUrl, {
      request: { headers: requestHeaders },
    })
    rewriteResponse.headers.set('x-store-id', storeId)
    rewriteResponse.headers.set('x-store-slug', slug)
    // Refresh session for storefront visitors
    const { response: sessionResponse } = await createSupabaseMiddlewareClient(request)
    // Copy session cookies from the Supabase middleware response
    for (const cookie of sessionResponse.cookies.getAll()) {
      rewriteResponse.cookies.set(cookie)
    }
    return addSecurityHeaders(rewriteResponse)
  }

  // Use response headers to pass tenant context downstream
  const { response } = await createSupabaseMiddlewareClient(request)
  response.headers.set('x-store-id', storeId)
  response.headers.set('x-store-slug', slug)
  return addSecurityHeaders(response)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
