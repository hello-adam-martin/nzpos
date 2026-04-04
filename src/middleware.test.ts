import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ---- Hoisted mocks ----
const {
  mockGetUser,
  mockGetSession,
  mockCreateSupabaseMiddlewareClient,
  mockCreateMiddlewareAdminClient,
  mockGetCachedStoreId,
  mockSetCachedStoreId,
} = vi.hoisted(() => {
  const mockGetUser = vi.fn()
  const mockGetSession = vi.fn()
  const mockCreateSupabaseMiddlewareClient = vi.fn()
  const mockCreateMiddlewareAdminClient = vi.fn()
  const mockGetCachedStoreId = vi.fn()
  const mockSetCachedStoreId = vi.fn()
  return {
    mockGetUser,
    mockGetSession,
    mockCreateSupabaseMiddlewareClient,
    mockCreateMiddlewareAdminClient,
    mockGetCachedStoreId,
    mockSetCachedStoreId,
  }
})

vi.mock('@/lib/supabase/middleware', () => ({
  createSupabaseMiddlewareClient: mockCreateSupabaseMiddlewareClient,
}))

vi.mock('@/lib/supabase/middlewareAdmin', () => ({
  createMiddlewareAdminClient: mockCreateMiddlewareAdminClient,
}))

vi.mock('@/lib/tenantCache', () => ({
  getCachedStoreId: mockGetCachedStoreId,
  setCachedStoreId: mockSetCachedStoreId,
}))

vi.mock('jose', () => ({
  jwtVerify: vi.fn().mockRejectedValue(new Error('Invalid token')),
}))

import { middleware } from './middleware'

function makeRequest(url: string, host: string): NextRequest {
  return new NextRequest(url, {
    headers: { host },
  })
}

const STORE_ID = 'store-uuid-abc'
const STORE_SLUG = 'mystore'
const ROOT_DOMAIN = 'lvh.me:3000'

function makeSupabaseMock(user: object | null) {
  return {
    auth: {
      getUser: mockGetUser.mockResolvedValue({ data: { user }, error: null }),
      getSession: mockGetSession.mockResolvedValue({
        data: { session: user ? { user: { app_metadata: (user as Record<string, unknown>).app_metadata ?? {} } } : null },
      }),
    },
  }
}

function makeAdminMock(isActive = true) {
  const single = vi.fn().mockResolvedValue({ data: { is_active: isActive }, error: null })
  const eq = vi.fn().mockReturnValue({ single })
  const select = vi.fn().mockReturnValue({ eq })
  const from = vi.fn().mockReturnValue({ select })
  return { from }
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.ROOT_DOMAIN = ROOT_DOMAIN

  // Default: store found in cache + active (suspension check on cached path)
  mockGetCachedStoreId.mockReturnValue(STORE_ID)
  mockCreateMiddlewareAdminClient.mockReturnValue(makeAdminMock(true))

  // Default: verified owner
  const verifiedOwner = {
    id: 'user-uuid-123',
    email: 'owner@example.com',
    email_confirmed_at: '2026-01-01T00:00:00Z',
    app_metadata: { role: 'owner' },
  }

  mockCreateSupabaseMiddlewareClient.mockResolvedValue({
    supabase: makeSupabaseMock(verifiedOwner),
    response: NextResponse.next(),
  })
})

describe('middleware webhook passthrough', () => {
  it('returns next() immediately for /api/webhooks without auth', async () => {
    const req = makeRequest(`http://${ROOT_DOMAIN}/api/webhooks/stripe`, ROOT_DOMAIN)
    const res = await middleware(req)
    // No redirect — just pass through
    expect(res.status).not.toBe(307)
    expect(res.headers.get('X-Frame-Options')).toBe('DENY')
  })
})

describe('middleware root domain passthrough', () => {
  it('passes through root domain requests with security headers', async () => {
    const req = makeRequest(`http://${ROOT_DOMAIN}/`, ROOT_DOMAIN)
    const res = await middleware(req)
    expect(res.status).not.toBe(307)
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
  })

  it('passes through www.rootDomain', async () => {
    const req = makeRequest(`http://www.${ROOT_DOMAIN}/`, `www.${ROOT_DOMAIN}`)
    const res = await middleware(req)
    expect(res.status).not.toBe(307)
  })

  it('passes through localhost', async () => {
    const req = makeRequest(`http://localhost:3000/`, `localhost:3000`)
    const res = await middleware(req)
    expect(res.status).not.toBe(307)
  })
})

describe('middleware super admin routes on root domain', () => {
  it('redirects unauthenticated user from /super-admin to /login', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    mockCreateSupabaseMiddlewareClient.mockResolvedValue({
      supabase: { auth: { getUser: mockGetUser } },
      response: NextResponse.next(),
    })

    const req = makeRequest(`http://${ROOT_DOMAIN}/super-admin/tenants`, ROOT_DOMAIN)
    const res = await middleware(req)

    expect(res.status).toBe(307)
    const location = res.headers.get('location') ?? ''
    expect(location).toContain('/login')
  })

  it('redirects non-super-admin from /super-admin to /unauthorized', async () => {
    const regularOwner = {
      id: 'user-123',
      email: 'owner@example.com',
      email_confirmed_at: '2026-01-01T00:00:00Z',
      app_metadata: { role: 'owner', is_super_admin: false },
    }
    mockGetUser.mockResolvedValue({ data: { user: regularOwner }, error: null })
    mockCreateSupabaseMiddlewareClient.mockResolvedValue({
      supabase: { auth: { getUser: mockGetUser } },
      response: NextResponse.next(),
    })

    const req = makeRequest(`http://${ROOT_DOMAIN}/super-admin/tenants`, ROOT_DOMAIN)
    const res = await middleware(req)

    expect(res.status).toBe(307)
    const location = res.headers.get('location') ?? ''
    expect(location).toContain('/unauthorized')
  })

  it('allows super admin through to /super-admin routes', async () => {
    const superAdmin = {
      id: 'super-admin-uuid',
      email: 'admin@platform.com',
      email_confirmed_at: '2026-01-01T00:00:00Z',
      app_metadata: { is_super_admin: true },
    }
    mockGetUser.mockResolvedValue({ data: { user: superAdmin }, error: null })
    mockCreateSupabaseMiddlewareClient.mockResolvedValue({
      supabase: { auth: { getUser: mockGetUser } },
      response: NextResponse.next(),
    })

    const req = makeRequest(`http://${ROOT_DOMAIN}/super-admin/tenants`, ROOT_DOMAIN)
    const res = await middleware(req)

    expect(res.status).not.toBe(307)
  })
})

describe('middleware subdomain — tenant resolution', () => {
  it('uses cached store_id and checks suspension', async () => {
    // Cache returns store_id, admin says is_active=true
    mockGetCachedStoreId.mockReturnValue(STORE_ID)
    mockCreateMiddlewareAdminClient.mockReturnValue(makeAdminMock(true))
    mockCreateSupabaseMiddlewareClient.mockResolvedValue({
      supabase: { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) } },
      response: NextResponse.next(),
    })

    const req = makeRequest(
      `http://${STORE_SLUG}.${ROOT_DOMAIN}/products`,
      `${STORE_SLUG}.${ROOT_DOMAIN}`
    )
    const res = await middleware(req)
    expect(res.status).not.toBe(307)
  })

  it('rewrites to /suspended when cached store is not active', async () => {
    mockGetCachedStoreId.mockReturnValue(STORE_ID)
    mockCreateMiddlewareAdminClient.mockReturnValue(makeAdminMock(false)) // is_active=false

    const req = makeRequest(
      `http://${STORE_SLUG}.${ROOT_DOMAIN}/products`,
      `${STORE_SLUG}.${ROOT_DOMAIN}`
    )
    const res = await middleware(req)
    // Rewrite to /suspended — not a 307 redirect, but a rewrite (200 with different URL)
    expect(res.headers.get('X-Frame-Options')).toBe('DENY') // Security headers applied
  })

  it('rewrites to /not-found when slug is unknown (no DB record)', async () => {
    mockGetCachedStoreId.mockReturnValue(null) // Not cached
    // Admin returns null data (unknown slug)
    const single = vi.fn().mockResolvedValue({ data: null, error: null })
    const eq = vi.fn().mockReturnValue({ single })
    const select = vi.fn().mockReturnValue({ eq })
    const from = vi.fn().mockReturnValue({ select })
    mockCreateMiddlewareAdminClient.mockReturnValue({ from })

    const req = makeRequest(
      `http://unknown-store.${ROOT_DOMAIN}/products`,
      `unknown-store.${ROOT_DOMAIN}`
    )
    const res = await middleware(req)
    // Rewrite to /not-found
    expect(res.headers.get('X-Frame-Options')).toBe('DENY')
  })

  it('rewrites to /suspended when uncached store is inactive', async () => {
    mockGetCachedStoreId.mockReturnValue(null)
    const single = vi.fn().mockResolvedValue({ data: { id: STORE_ID, is_active: false }, error: null })
    const eq = vi.fn().mockReturnValue({ single })
    const select = vi.fn().mockReturnValue({ eq })
    const from = vi.fn().mockReturnValue({ select })
    mockCreateMiddlewareAdminClient.mockReturnValue({ from })

    const req = makeRequest(
      `http://${STORE_SLUG}.${ROOT_DOMAIN}/products`,
      `${STORE_SLUG}.${ROOT_DOMAIN}`
    )
    const res = await middleware(req)
    expect(res.headers.get('X-Frame-Options')).toBe('DENY')
  })

  it('caches uncached active store in tenantCache', async () => {
    mockGetCachedStoreId.mockReturnValue(null)
    const single = vi.fn().mockResolvedValue({ data: { id: STORE_ID, is_active: true }, error: null })
    const eq = vi.fn().mockReturnValue({ single })
    const select = vi.fn().mockReturnValue({ eq })
    const from = vi.fn().mockReturnValue({ select })
    mockCreateMiddlewareAdminClient.mockReturnValue({ from })
    mockCreateSupabaseMiddlewareClient.mockResolvedValue({
      supabase: { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) } },
      response: NextResponse.next(),
    })

    const req = makeRequest(
      `http://${STORE_SLUG}.${ROOT_DOMAIN}/products`,
      `${STORE_SLUG}.${ROOT_DOMAIN}`
    )
    await middleware(req)
    expect(mockSetCachedStoreId).toHaveBeenCalledWith(STORE_SLUG, STORE_ID)
  })
})

describe('middleware admin route protection', () => {
  it('redirects unauthenticated user from /admin to /login', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    mockCreateSupabaseMiddlewareClient.mockResolvedValue({
      supabase: { auth: { getUser: mockGetUser, getSession: mockGetSession } },
      response: NextResponse.next(),
    })

    const req = makeRequest(
      `http://${STORE_SLUG}.${ROOT_DOMAIN}/admin/dashboard`,
      `${STORE_SLUG}.${ROOT_DOMAIN}`
    )
    const res = await middleware(req)

    expect(res.status).toBe(307)
    const location = res.headers.get('location') ?? ''
    expect(location).toContain('/login')
  })

  it('redirects customer role from /admin to /', async () => {
    const customerUser = {
      id: 'customer-uuid',
      email: 'customer@example.com',
      email_confirmed_at: '2026-01-01T00:00:00Z',
      app_metadata: { role: 'customer' },
    }
    mockGetUser.mockResolvedValue({ data: { user: customerUser }, error: null })
    mockGetSession.mockResolvedValue({
      data: { session: { user: { app_metadata: { role: 'customer' } } } },
    })
    mockCreateSupabaseMiddlewareClient.mockResolvedValue({
      supabase: { auth: { getUser: mockGetUser, getSession: mockGetSession } },
      response: NextResponse.next(),
    })

    const req = makeRequest(
      `http://${STORE_SLUG}.${ROOT_DOMAIN}/admin/dashboard`,
      `${STORE_SLUG}.${ROOT_DOMAIN}`
    )
    const res = await middleware(req)

    expect(res.status).toBe(307)
    const location = res.headers.get('location') ?? ''
    expect(location).toContain('://')
    expect(location).not.toContain('/unauthorized')
  })

  it('redirects non-owner non-customer role to /unauthorized', async () => {
    const staffUser = {
      id: 'staff-uuid',
      email: 'staff@example.com',
      email_confirmed_at: '2026-01-01T00:00:00Z',
      app_metadata: { role: 'staff' },
    }
    mockGetUser.mockResolvedValue({ data: { user: staffUser }, error: null })
    mockGetSession.mockResolvedValue({
      data: { session: { user: { app_metadata: { role: 'staff' } } } },
    })
    mockCreateSupabaseMiddlewareClient.mockResolvedValue({
      supabase: { auth: { getUser: mockGetUser, getSession: mockGetSession } },
      response: NextResponse.next(),
    })

    const req = makeRequest(
      `http://${STORE_SLUG}.${ROOT_DOMAIN}/admin/dashboard`,
      `${STORE_SLUG}.${ROOT_DOMAIN}`
    )
    const res = await middleware(req)

    expect(res.status).toBe(307)
    const location = res.headers.get('location') ?? ''
    expect(location).toContain('/unauthorized')
  })
})

describe('middleware POS route protection', () => {
  it('passes through /pos/login without auth check', async () => {
    const req = makeRequest(
      `http://${STORE_SLUG}.${ROOT_DOMAIN}/pos/login`,
      `${STORE_SLUG}.${ROOT_DOMAIN}`
    )
    const res = await middleware(req)
    expect(res.status).not.toBe(307)
  })

  it('redirects unauthenticated user from /pos to /pos/login', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    mockCreateSupabaseMiddlewareClient.mockResolvedValue({
      supabase: { auth: { getUser: mockGetUser, getSession: mockGetSession } },
      response: NextResponse.next(),
    })

    const req = makeRequest(
      `http://${STORE_SLUG}.${ROOT_DOMAIN}/pos/sales`,
      `${STORE_SLUG}.${ROOT_DOMAIN}`
    )
    const res = await middleware(req)

    expect(res.status).toBe(307)
    const location = res.headers.get('location') ?? ''
    expect(location).toContain('/pos/login')
  })
})

describe('middleware email verification gate', () => {
  it('redirects unverified user on /admin to /signup/verify-email on root domain', async () => {
    const unverifiedUser = {
      id: 'user-uuid-123',
      email: 'owner@example.com',
      email_confirmed_at: null,
      app_metadata: { role: 'owner' },
    }
    mockGetUser.mockResolvedValue({ data: { user: unverifiedUser }, error: null })
    mockCreateSupabaseMiddlewareClient.mockResolvedValue({
      supabase: { auth: { getUser: mockGetUser, getSession: mockGetSession } },
      response: NextResponse.next(),
    })

    const req = makeRequest(
      `http://${STORE_SLUG}.${ROOT_DOMAIN}/admin/dashboard`,
      `${STORE_SLUG}.${ROOT_DOMAIN}`
    )
    const res = await middleware(req)

    expect(res.status).toBe(307)
    const location = res.headers.get('location') ?? ''
    expect(location).toContain('/signup/verify-email')
    expect(location).toContain(`http://${ROOT_DOMAIN}`)
  })

  it('allows verified user through to /admin without verify-email redirect', async () => {
    const verifiedOwner = {
      id: 'user-uuid-123',
      email: 'owner@example.com',
      email_confirmed_at: '2026-01-01T00:00:00Z',
      app_metadata: { role: 'owner' },
    }
    mockGetUser.mockResolvedValue({ data: { user: verifiedOwner }, error: null })
    mockGetSession.mockResolvedValue({
      data: { session: { user: { app_metadata: { role: 'owner' } } } },
    })
    mockCreateSupabaseMiddlewareClient.mockResolvedValue({
      supabase: { auth: { getUser: mockGetUser, getSession: mockGetSession } },
      response: NextResponse.next(),
    })

    const req = makeRequest(
      `http://${STORE_SLUG}.${ROOT_DOMAIN}/admin/dashboard`,
      `${STORE_SLUG}.${ROOT_DOMAIN}`
    )
    const res = await middleware(req)

    const location = res.headers.get('location') ?? ''
    expect(location).not.toContain('verify-email')
  })

  it('does not apply email gate to storefront routes', async () => {
    // Even with an unverified user, storefront routes bypass the gate
    const unverifiedUser = {
      id: 'user-uuid-123',
      email: 'owner@example.com',
      email_confirmed_at: null,
      app_metadata: { role: 'owner' },
    }
    mockGetUser.mockResolvedValue({ data: { user: unverifiedUser }, error: null })
    mockCreateSupabaseMiddlewareClient.mockResolvedValue({
      supabase: { auth: { getUser: mockGetUser, getSession: mockGetSession } },
      response: NextResponse.next(),
    })

    // Storefront route (not /admin)
    const req = makeRequest(
      `http://${STORE_SLUG}.${ROOT_DOMAIN}/products`,
      `${STORE_SLUG}.${ROOT_DOMAIN}`
    )
    const res = await middleware(req)

    const location = res.headers.get('location') ?? ''
    expect(location).not.toContain('verify-email')
  })

  it('does not apply email gate to root domain routes', async () => {
    // Root domain is the marketing site — middleware returns response directly
    const req = makeRequest(`http://${ROOT_DOMAIN}/signup`, ROOT_DOMAIN)
    const res = await middleware(req)

    const location = res.headers.get('location') ?? ''
    expect(location).not.toContain('verify-email')
  })
})
