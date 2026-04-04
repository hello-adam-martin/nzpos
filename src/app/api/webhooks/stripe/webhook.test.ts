import { describe, test, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Hoisted mocks (available inside vi.mock factories)
// ---------------------------------------------------------------------------
const { mockConstructEvent, mockHeadersGet, mockRpc, mockFrom, mockSendEmail } = vi.hoisted(() => {
  return {
    mockConstructEvent: vi.fn(),
    mockHeadersGet: vi.fn(),
    mockRpc: vi.fn(),
    mockFrom: vi.fn(),
    mockSendEmail: vi.fn(),
  }
})

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('server-only', () => ({}))

vi.mock('@/lib/email', () => ({
  sendEmail: mockSendEmail,
}))

vi.mock('@/emails/OnlineReceiptEmail', () => ({
  OnlineReceiptEmail: vi.fn(() => null),
}))

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
      p_items: orderItems,
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

  test('sends email receipt when customer email is present and receipt_data exists', async () => {
    mockConstructEvent.mockReturnValue(mockEvent)
    mockSendEmail.mockResolvedValue({ data: null, error: null })

    const receiptData = {
      orderId: mockSession.metadata.order_id,
      storeName: 'Test Store',
      storeAddress: '1 Main St',
      storePhone: '09 123 4567',
      gstNumber: '123-456-789',
      completedAt: new Date().toISOString(),
      staffName: 'Online',
      items: [],
      subtotalCents: 5000,
      gstCents: 652,
      totalCents: 5000,
      paymentMethod: 'online',
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'stripe_events') {
        return createChain({ data: null, error: null })
      }
      if (table === 'order_items') {
        return createChain({ data: [{ product_id: 'prod-1', quantity: 1 }], error: null })
      }
      if (table === 'orders') {
        return createChain({
          data: { promo_id: null, id: mockSession.metadata.order_id, total_cents: 5000, created_at: new Date().toISOString(), receipt_data: receiptData },
          error: null,
        })
      }
      return createChain({ data: null, error: null })
    })
    mockRpc.mockResolvedValue({ error: null })

    const res = await POST(makeRequest('raw-body'))
    expect(res.status).toBe(200)
    // Email is fire-and-forget (void) — verify sendEmail was called
    // Allow async microtasks to settle
    await Promise.resolve()
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@example.com',
        subject: expect.stringContaining('receipt'),
      })
    )
  })

  test('returns 200 without calling RPC when metadata is missing store_id', async () => {
    const sessionMissingMetadata = {
      ...mockSession,
      metadata: { order_id: 'some-order-id' }, // missing store_id
    }
    const eventMissingMeta = {
      ...mockEvent,
      data: { object: sessionMissingMetadata },
    }
    mockConstructEvent.mockReturnValue(eventMissingMeta)

    mockFrom.mockImplementation((table: string) => {
      if (table === 'stripe_events') {
        return createChain({ data: null, error: null })
      }
      return createChain({ data: null, error: null })
    })

    const res = await POST(makeRequest('raw-body'))
    // Missing metadata returns 200 (handler logs and returns early, doesn't crash)
    expect(res.status).toBe(200)
    // RPC should NOT have been called
    expect(mockRpc).not.toHaveBeenCalled()
  })

  test('returns 200 without calling RPC when metadata is missing order_id', async () => {
    const sessionMissingOrderId = {
      ...mockSession,
      metadata: { store_id: 'store-1' }, // missing order_id
    }
    const eventMissingOrderId = {
      ...mockEvent,
      data: { object: sessionMissingOrderId },
    }
    mockConstructEvent.mockReturnValue(eventMissingOrderId)

    mockFrom.mockImplementation(() => createChain({ data: null, error: null }))

    const res = await POST(makeRequest('raw-body'))
    expect(res.status).toBe(200)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  test('sends email via fallback path when receipt_data is null (builds from order_items + store)', async () => {
    mockConstructEvent.mockReturnValue(mockEvent)
    mockSendEmail.mockResolvedValue({ data: null, error: null })

    const fullItems = [
      {
        product_id: 'prod-1',
        quantity: 2,
        unit_price_cents: 2300,
        line_total_cents: 4600,
        discount_cents: 0,
        products: { name: 'Widget' },
      },
    ]
    const storeData = {
      name: 'My Store',
      address: '1 Queen St',
      phone: '09 000 0000',
      gst_number: '111-222-333',
    }

    let orderCallCount = 0

    mockFrom.mockImplementation((table: string) => {
      if (table === 'stripe_events') {
        return createChain({ data: null, error: null })
      }
      if (table === 'order_items') {
        // First call: complete_online_sale fetch (product_id, quantity)
        // Second call: fallback email fetch (extended select)
        orderCallCount++
        if (orderCallCount === 1) {
          return createChain({ data: [{ product_id: 'prod-1', quantity: 2 }], error: null })
        }
        return createChain({ data: fullItems, error: null })
      }
      if (table === 'orders') {
        return createChain({
          data: { promo_id: null, id: mockSession.metadata.order_id, total_cents: 4600, created_at: new Date().toISOString(), receipt_data: null },
          error: null,
        })
      }
      if (table === 'stores') {
        return createChain({ data: storeData, error: null })
      }
      return createChain({ data: null, error: null })
    })
    mockRpc.mockResolvedValue({ error: null })

    const res = await POST(makeRequest('raw-body'))
    expect(res.status).toBe(200)
    await Promise.resolve()
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@example.com',
        subject: expect.stringContaining('My Store'),
      })
    )
  })
})
