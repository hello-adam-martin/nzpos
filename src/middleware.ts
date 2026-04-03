import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseMiddlewareClient } from '@/lib/supabase/middleware'
import { createMiddlewareAdminClient } from '@/lib/supabase/middlewareAdmin'
import { getCachedStoreId, setCachedStoreId } from '@/lib/tenantCache'
import { jwtVerify } from 'jose'

const staffSecret = new TextEncoder().encode(process.env.STAFF_JWT_SECRET!)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Webhook routes — no auth, no tenant resolution
  if (pathname.startsWith('/api/webhooks')) {
    return NextResponse.next()
  }

  // 2. Determine if this is the root domain or a store subdomain
  const host = request.headers.get('host') ?? ''
  const rootDomain = process.env.ROOT_DOMAIN ?? 'lvh.me:3000'
  const isRoot = host === rootDomain || host === `www.${rootDomain}` || host.startsWith('localhost')

  // 3. Root domain — marketing site (per D-05). Pass through with session refresh.
  if (isRoot) {
    const { response } = await createSupabaseMiddlewareClient(request)
    return response
  }

  // 4. Subdomain — extract slug and resolve store_id (per D-01)
  const slug = host.split('.')[0]
  const cached = getCachedStoreId(slug)
  let storeId: string

  if (cached) {
    storeId = cached
  } else {
    const admin = createMiddlewareAdminClient()
    const { data } = await admin
      .from('stores')
      .select('id')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (!data) {
      // Unknown or inactive subdomain — 404 (per D-03)
      return NextResponse.rewrite(new URL('/not-found', request.url))
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
      return NextResponse.redirect(loginUrl)
    }

    // D-07: Email verification gate — unverified owners cannot access admin
    const emailVerified = user.email_confirmed_at != null
    if (!emailVerified) {
      const rootDomain = process.env.ROOT_DOMAIN ?? 'lvh.me:3000'
      const protocol =
        rootDomain.includes('localhost') || rootDomain.includes('lvh.me') ? 'http' : 'https'
      const verifyUrl = new URL(`${protocol}://${rootDomain}/signup/verify-email`)
      verifyUrl.searchParams.set('email', user.email ?? '')
      return NextResponse.redirect(verifyUrl)
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()
    const role = session?.user?.app_metadata?.role
    // D-10: Block customer role from admin routes — silent redirect to storefront
    if (role === 'customer') {
      return NextResponse.redirect(new URL('/', request.url))
    }
    if (role !== 'owner') {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }

    // Inject tenant headers into the response for downstream Server Components
    response.headers.set('x-store-id', storeId)
    response.headers.set('x-store-slug', slug)
    return response
  }

  // 7. POS login — pass through with tenant headers (PRESERVED)
  if (pathname === '/pos/login') {
    return NextResponse.next({
      request: { headers: requestHeaders },
    })
  }

  // 8. POS routes — staff or owner (PRESERVED)
  if (pathname.startsWith('/pos')) {
    // D-10: Block customer role from POS routes — silent redirect to storefront
    const { supabase: posSupabase } = await createSupabaseMiddlewareClient(request)
    const {
      data: { user: posUser },
    } = await posSupabase.auth.getUser()
    if (posUser?.app_metadata?.role === 'customer') {
      return NextResponse.redirect(new URL('/', request.url))
    }

    const staffToken = request.cookies.get('staff_session')?.value
    if (staffToken) {
      try {
        const { payload } = await jwtVerify(staffToken, staffSecret)
        if (payload.role === 'staff' || payload.role === 'owner') {
          return NextResponse.next({
            request: { headers: requestHeaders },
          })
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
        return response
      }
    }

    return NextResponse.redirect(new URL('/pos/login', request.url))
  }

  // 9. Storefront routes — public, refresh session if present (PRESERVED)
  // Use response headers to pass tenant context downstream
  const { response } = await createSupabaseMiddlewareClient(request)
  response.headers.set('x-store-id', storeId)
  response.headers.set('x-store-slug', slug)
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
