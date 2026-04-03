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
