import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseMiddlewareClient } from '@/lib/supabase/middleware'
import { jwtVerify } from 'jose'

const staffSecret = new TextEncoder().encode(process.env.STAFF_JWT_SECRET!)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes — no auth required
  if (pathname.startsWith('/api/webhooks')) {
    return NextResponse.next()
  }

  // Admin routes — owner only (Supabase Auth)
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

    // Verify user has owner role via JWT claims
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const role = session?.user?.app_metadata?.role
    if (role !== 'owner') {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }

    return response
  }

  // POS routes — staff or owner (staff_session cookie with jose JWT)
  // Allow POS login page through without auth
  if (pathname === '/pos/login') {
    return NextResponse.next()
  }
  if (pathname.startsWith('/pos')) {
    const staffToken = request.cookies.get('staff_session')?.value

    if (staffToken) {
      try {
        const { payload } = await jwtVerify(staffToken, staffSecret)
        if (payload.role === 'staff' || payload.role === 'owner') {
          return NextResponse.next()
        }
      } catch {
        // Token expired or invalid — fall through to check Supabase auth
      }
    }

    // Also allow owner access via Supabase Auth session
    const { supabase, response } = await createSupabaseMiddlewareClient(request)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session?.user?.app_metadata?.role === 'owner') {
        return response
      }
    }

    // No valid session — redirect to PIN login
    return NextResponse.redirect(new URL('/pos/login', request.url))
  }

  // Store routes — public, but refresh Supabase session if present
  const { response } = await createSupabaseMiddlewareClient(request)
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
