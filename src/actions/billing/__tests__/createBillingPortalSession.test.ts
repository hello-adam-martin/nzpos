import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const {
  mockPortalSessionCreate,
  mockGetUser,
  mockCreateSupabaseServerClient,
  mockCreateSupabaseAdminClient,
  mockAdminFrom,
  mockHeaders,
} = vi.hoisted(() => {
  const mockPortalSessionCreate = vi.fn()
  const mockGetUser = vi.fn()
  const mockCreateSupabaseServerClient = vi.fn()
  const mockCreateSupabaseAdminClient = vi.fn()
  const mockAdminFrom = vi.fn()
  const mockHeaders = vi.fn()

  return {
    mockPortalSessionCreate,
    mockGetUser,
    mockCreateSupabaseServerClient,
    mockCreateSupabaseAdminClient,
    mockAdminFrom,
    mockHeaders,
  }
})

vi.mock('server-only', () => ({}))

vi.mock('next/headers', () => ({
  headers: mockHeaders,
}))

vi.mock('stripe', () => {
  function Stripe() {
    return {
      billingPortal: {
        sessions: { create: mockPortalSessionCreate },
      },
    }
  }
  return { default: Stripe, __esModule: true }
})

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mockCreateSupabaseServerClient,
}))

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: mockCreateSupabaseAdminClient,
}))

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import { createBillingPortalSession } from '../createBillingPortalSession'

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

function makeAdminChain(storeData: any) {
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    single: () => Promise.resolve({ data: storeData, error: null }),
    maybeSingle: () => Promise.resolve({ data: storeData, error: null }),
    then: (resolve: any) => Promise.resolve({ data: storeData, error: null }).then(resolve),
  }
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()

  // Default: headers returns a localhost host
  mockHeaders.mockResolvedValue({
    get: (name: string) => (name === 'host' ? 'localhost:3000' : null),
  })

  // Default: authenticated user with store_id in app_metadata
  mockGetUser.mockResolvedValue({
    data: {
      user: {
        id: 'user-uuid-123',
        app_metadata: { store_id: 'store-uuid-abc' },
      },
    },
    error: null,
  })

  mockCreateSupabaseServerClient.mockResolvedValue({
    auth: { getUser: mockGetUser },
  })

  // Default: store has existing stripe_customer_id
  mockAdminFrom.mockImplementation(() =>
    makeAdminChain({ id: 'store-uuid-abc', stripe_customer_id: 'cus_existing_789' })
  )
  mockCreateSupabaseAdminClient.mockReturnValue({
    from: (...args: any[]) => mockAdminFrom(...args),
  })

  // Default: portal session returns URL
  mockPortalSessionCreate.mockResolvedValue({
    url: 'https://billing.stripe.com/session/test_portal_456',
  })
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createBillingPortalSession', () => {
  it('returns { url } with valid portal URL when stripe_customer_id exists', async () => {
    const result = await createBillingPortalSession()
    expect(result).toHaveProperty('url')
    expect((result as any).url).toBe('https://billing.stripe.com/session/test_portal_456')
    expect(mockPortalSessionCreate).toHaveBeenCalled()
  })

  it('returns { error: "no_customer" } when stripe_customer_id is null', async () => {
    mockAdminFrom.mockImplementation(() =>
      makeAdminChain({ id: 'store-uuid-abc', stripe_customer_id: null })
    )

    const result = await createBillingPortalSession()
    expect(result).toEqual({ error: 'no_customer' })
    expect(mockPortalSessionCreate).not.toHaveBeenCalled()
  })

  it('returns { error } when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })

    const result = await createBillingPortalSession()
    expect(result).toHaveProperty('error')
    expect(mockPortalSessionCreate).not.toHaveBeenCalled()
  })

  it('calls stripe.billingPortal.sessions.create with correct customer ID', async () => {
    await createBillingPortalSession()

    expect(mockPortalSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_existing_789' })
    )
  })

  it('includes return_url pointing to /admin/billing', async () => {
    await createBillingPortalSession()

    const call = mockPortalSessionCreate.mock.calls[0][0]
    expect(call.return_url).toContain('/admin/billing')
  })
})
