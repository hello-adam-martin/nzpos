import { describe, test, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Hoisted mocks (available inside vi.mock factories)
// ---------------------------------------------------------------------------
const { mockConstructEvent, mockHeadersGet, mockRpc, mockFrom } = vi.hoisted(() => {
  return {
    mockConstructEvent: vi.fn(),
    mockHeadersGet: vi.fn(),
    mockRpc: vi.fn(),
    mockFrom: vi.fn(),
  }
})

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('server-only', () => ({}))

vi.mock('next/headers', () => ({
  headers: () => Promise.resolve({ get: mockHeadersGet }),
}))

vi.mock('stripe', () => {
  function Stripe() {
    return { webhooks: { constructEvent: mockConstructEvent } }
  }
  return { default: Stripe, __esModule: true }
})

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    from: (...args: any[]) => mockFrom(...args),
    rpc: mockRpc,
  }),
}))

function createChain(resolvedValue: any) {
  const chain: any = {
    select: () => chain,
    single: () => Promise.resolve(resolvedValue),
    maybeSingle: () => Promise.resolve(resolvedValue),
    eq: () => chain,
    insert: () => Promise.resolve(resolvedValue),
    then: (resolve: any) => Promise.resolve(resolvedValue).then(resolve),
  }
  return chain
}

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import { POST } from './route'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: string) {
  return new Request('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    body,
    headers: { 'stripe-signature': 'sig_test' },
  })
}

const mockSession = {
  id: 'cs_test_123',
  payment_intent: 'pi_test_456',
  customer_details: { email: 'test@example.com' },
  metadata: {
    order_id: 'a1b2c3d4-e5f6-4890-abcd-ef1234567890',
    store_id: 'store-1',
  },
}

const mockEvent = {
  id: 'evt_test_789',
  type: 'checkout.session.completed',
  data: { object: mockSession },
}

beforeEach(() => {
  vi.clearAllMocks()
  mockHeadersGet.mockReturnValue('sig_test')
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Stripe Webhook Handler', () => {
  test('returns 400 on invalid signature', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('Invalid signature')
    })

    const res = await POST(makeRequest('{}'))
    expect(res.status).toBe(400)
  })

  test('processes checkout.session.completed event', async () => {
    mockConstructEvent.mockReturnValue(mockEvent)

    mockFrom.mockImplementation((table: string) => {
      if (table === 'stripe_events') {
        return createChain({ data: null, error: null })
      }
      if (table === 'order_items') {
        return createChain({
          data: [{ product_id: 'prod-1', quantity: 2 }],
          error: null,
        })
      }
      if (table === 'orders') {
        return createChain({ data: { promo_id: null }, error: null })
      }
      return createChain({ data: null, error: null })
    })
    mockRpc.mockResolvedValue({ error: null })

    const res = await POST(makeRequest('raw-body'))
    expect(res.status).toBe(200)
    expect(mockRpc).toHaveBeenCalledWith('complete_online_sale', expect.objectContaining({
      p_store_id: 'store-1',
      p_order_id: 'a1b2c3d4-e5f6-4890-abcd-ef1234567890',
    }))
  })

  test('silently ignores duplicate events (idempotency)', async () => {
    mockConstructEvent.mockReturnValue(mockEvent)

    // stripe_events select returns existing event — already processed
    mockFrom.mockImplementation((table: string) => {
      if (table === 'stripe_events') {
        return createChain({ data: { id: 'evt_test_789' }, error: null })
      }
      return createChain({ data: null, error: null })
    })

    const res = await POST(makeRequest('raw-body'))
    expect(res.status).toBe(200)
    // RPC should NOT have been called — event was a duplicate
    expect(mockRpc).not.toHaveBeenCalled()
  })

  test('calls complete_online_sale RPC with correct params', async () => {
    mockConstructEvent.mockReturnValue(mockEvent)

    const orderItems = [
      { product_id: 'prod-1', quantity: 3 },
      { product_id: 'prod-2', quantity: 1 },
    ]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'stripe_events') {
        return createChain({ data: null, error: null })
      }
      if (table === 'order_items') {
        return createChain({ data: orderItems, error: null })
      }
      if (table === 'orders') {
        return createChain({ data: { promo_id: null }, error: null })
      }
      return createChain({ data: null, error: null })
    })
    mockRpc.mockResolvedValue({ error: null })

    await POST(makeRequest('raw-body'))

    expect(mockRpc).toHaveBeenCalledWith('complete_online_sale', {
      p_store_id: 'store-1',
      p_order_id: 'a1b2c3d4-e5f6-4890-abcd-ef1234567890',
      p_stripe_session_id: 'cs_test_123',
      p_stripe_payment_intent_id: 'pi_test_456',
      p_customer_email: 'test@example.com',
      p_items: JSON.stringify(orderItems),
    })
  })

  test('increments promo uses when order has promo_id', async () => {
    mockConstructEvent.mockReturnValue(mockEvent)

    mockFrom.mockImplementation((table: string) => {
      if (table === 'stripe_events') {
        return createChain({ data: null, error: null })
      }
      if (table === 'order_items') {
        return createChain({ data: [{ product_id: 'prod-1', quantity: 1 }], error: null })
      }
      if (table === 'orders') {
        return createChain({
          data: { promo_id: 'promo-abc' },
          error: null,
        })
      }
      return createChain({ data: null, error: null })
    })
    mockRpc.mockResolvedValue({ error: null })

    await POST(makeRequest('raw-body'))

    expect(mockRpc).toHaveBeenCalledWith('increment_promo_uses', { p_promo_id: 'promo-abc' })
  })
})
