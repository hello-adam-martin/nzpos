import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const {
  mockCheckoutSessionCreate,
  mockGetUser,
  mockCreateSupabaseServerClient,
  mockCreateSupabaseAdminClient,
  mockAdminFrom,
  mockHeaders,
} = vi.hoisted(() => {
  const mockCheckoutSessionCreate = vi.fn()
  const mockGetUser = vi.fn()
  const mockCreateSupabaseServerClient = vi.fn()
  const mockCreateSupabaseAdminClient = vi.fn()
  const mockAdminFrom = vi.fn()
  const mockHeaders = vi.fn()

  return {
    mockCheckoutSessionCreate,
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
      checkout: {
        sessions: { create: mockCheckoutSessionCreate },
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

vi.mock('@/config/addons', () => ({
  PRICE_ID_MAP: {
    xero: 'price_xero_test',
    email_notifications: 'price_email_test',
    custom_domain: 'price_domain_test',
  },
}))

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import { createSubscriptionCheckoutSession } from '../createSubscriptionCheckoutSession'

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

  // Default: store has no existing stripe_customer_id
  mockAdminFrom.mockImplementation(() => makeAdminChain({ id: 'store-uuid-abc', stripe_customer_id: null }))
  mockCreateSupabaseAdminClient.mockReturnValue({
    from: (...args: any[]) => mockAdminFrom(...args),
  })

  // Default: Stripe checkout session returns a URL
  mockCheckoutSessionCreate.mockResolvedValue({
    url: 'https://checkout.stripe.com/pay/test_session_123',
  })
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createSubscriptionCheckoutSession', () => {
  it('returns { url } with valid Stripe Checkout URL for feature xero', async () => {
    const result = await createSubscriptionCheckoutSession('xero')
    expect(result).toHaveProperty('url')
    expect((result as any).url).toBe('https://checkout.stripe.com/pay/test_session_123')
    expect(mockCheckoutSessionCreate).toHaveBeenCalled()
  })

  it('creates session with mode=subscription and trial_period_days=14', async () => {
    await createSubscriptionCheckoutSession('xero')

    const call = mockCheckoutSessionCreate.mock.calls[0][0]
    expect(call.mode).toBe('subscription')
    expect(call.subscription_data?.trial_period_days).toBe(14)
  })

  it('includes store_id in subscription_data.metadata AND session metadata', async () => {
    await createSubscriptionCheckoutSession('xero')

    const call = mockCheckoutSessionCreate.mock.calls[0][0]
    expect(call.subscription_data?.metadata?.store_id).toBe('store-uuid-abc')
    expect(call.metadata?.store_id).toBe('store-uuid-abc')
  })

  it('reuses existing stripe_customer_id from stores table when available', async () => {
    mockAdminFrom.mockImplementation(() =>
      makeAdminChain({ id: 'store-uuid-abc', stripe_customer_id: 'cus_existing_789' })
    )

    await createSubscriptionCheckoutSession('xero')

    const call = mockCheckoutSessionCreate.mock.calls[0][0]
    expect(call.customer).toBe('cus_existing_789')
  })

  it('returns { error } when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })

    const result = await createSubscriptionCheckoutSession('xero')
    expect(result).toHaveProperty('error')
    expect(mockCheckoutSessionCreate).not.toHaveBeenCalled()
  })

  it('returns { error } for invalid feature param', async () => {
    const result = await createSubscriptionCheckoutSession('invalid_feature' as any)
    expect(result).toHaveProperty('error')
    expect(mockCheckoutSessionCreate).not.toHaveBeenCalled()
  })

  it('includes success_url with ?subscribed= query param', async () => {
    await createSubscriptionCheckoutSession('xero')

    const call = mockCheckoutSessionCreate.mock.calls[0][0]
    expect(call.success_url).toContain('?subscribed=xero')
  })

  it('uses correct price ID for the feature', async () => {
    await createSubscriptionCheckoutSession('email_notifications')

    const call = mockCheckoutSessionCreate.mock.calls[0][0]
    const priceId = call.line_items[0].price
    expect(priceId).toBe('price_email_test')
  })
})
