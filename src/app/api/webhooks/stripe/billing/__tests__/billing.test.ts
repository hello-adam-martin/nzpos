import { describe, test, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))

// ---------------------------------------------------------------------------
// Hoisted mocks (available inside vi.mock factories)
// ---------------------------------------------------------------------------
const {
  mockConstructEvent,
  mockHeadersGet,
  mockFrom,
  mockUpdate,
  mockEq,
  mockSelect,
  mockMaybeSingle,
  mockInsert,
  mockSingle,
} = vi.hoisted(() => {
  const mockInsert = vi.fn()
  const mockSingle = vi.fn()
  const mockMaybeSingle = vi.fn()
  const mockEq = vi.fn()
  const mockSelect = vi.fn()
  const mockUpdate = vi.fn()

  return {
    mockConstructEvent: vi.fn(),
    mockHeadersGet: vi.fn(),
    mockFrom: vi.fn(),
    mockUpdate,
    mockEq,
    mockSelect,
    mockMaybeSingle,
    mockInsert,
    mockSingle,
  }
})

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

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
  }),
}))

vi.mock('@/config/addons', () => ({
  PRICE_TO_FEATURE: {
    price_xero_test: 'has_xero',
    price_email_test: 'has_email_notifications',
    price_domain_test: 'has_custom_domain',
  },
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createChain(resolvedValue: any) {
  const chain: any = {
    select: (..._args: any[]) => chain,
    eq: (..._args: any[]) => chain,
    maybeSingle: () => Promise.resolve(resolvedValue),
    single: () => Promise.resolve(resolvedValue),
    insert: (..._args: any[]) => Promise.resolve(resolvedValue),
    update: (..._args: any[]) => chain,
    is: (..._args: any[]) => chain,
    then: (resolve: any) => Promise.resolve(resolvedValue).then(resolve),
  }
  return chain
}

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import { POST } from '../route'

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

function makeSubscription(overrides: Record<string, any> = {}) {
  return {
    id: 'sub_test_123',
    customer: 'cus_test_456',
    status: 'active',
    metadata: { store_id: 'store-uuid-abc' },
    items: {
      data: [
        { price: { id: 'price_xero_test' } },
      ],
    },
    ...overrides,
  }
}

function makeEvent(type: string, subscription: any, eventId = 'evt_test_001') {
  return {
    id: eventId,
    type,
    data: { object: subscription },
  }
}

function makeRequest(body = 'raw-body') {
  return new Request('http://localhost/api/webhooks/stripe/billing', {
    method: 'POST',
    body,
    headers: { 'stripe-signature': 'sig_test' },
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
  mockHeadersGet.mockReturnValue('sig_test')
  process.env.STRIPE_BILLING_WEBHOOK_SECRET = 'whsec_billing_test'
})

describe('Billing Webhook Handler', () => {
  test('returns 400 on invalid signature', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('Invalid signature')
    })
    const res = await POST(makeRequest())
    expect(res.status).toBe(400)
  })

  test('returns 200 for unrecognized event type without processing', async () => {
    const event = makeEvent('payment_intent.succeeded', makeSubscription())
    mockConstructEvent.mockReturnValue(event)

    const res = await POST(makeRequest())
    expect(res.status).toBe(200)
    // from() should not be called for unrecognized events
    expect(mockFrom).not.toHaveBeenCalled()
  })

  test('updates store_plans has_xero=true for customer.subscription.created with xero price', async () => {
    const subscription = makeSubscription({ status: 'active' })
    const event = makeEvent('customer.subscription.created', subscription)
    mockConstructEvent.mockReturnValue(event)

    let updatedTable: string | null = null
    let updatedData: any = null

    mockFrom.mockImplementation((table: string) => {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        is: () => chain,
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
        single: () => Promise.resolve({ data: { stripe_customer_id: null }, error: null }),
        insert: (_data: any) => Promise.resolve({ data: null, error: null }),
        update: (data: any) => {
          updatedTable = table
          updatedData = data
          return chain
        },
        then: (resolve: any) => Promise.resolve({ data: null, error: null }).then(resolve),
      }
      return chain
    })

    const res = await POST(makeRequest())
    expect(res.status).toBe(200)
    expect(updatedTable).toBe('store_plans')
    expect(updatedData).toMatchObject({ has_xero: true })
  })

  test('sets has_xero=false for customer.subscription.deleted', async () => {
    const subscription = makeSubscription({ status: 'canceled' })
    const event = makeEvent('customer.subscription.deleted', subscription)
    mockConstructEvent.mockReturnValue(event)

    let updatedData: any = null

    mockFrom.mockImplementation((table: string) => {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        is: () => chain,
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
        single: () => Promise.resolve({ data: { stripe_customer_id: null }, error: null }),
        insert: (_data: any) => Promise.resolve({ data: null, error: null }),
        update: (data: any) => {
          if (table === 'store_plans') {
            updatedData = data
          }
          return chain
        },
        then: (resolve: any) => Promise.resolve({ data: null, error: null }).then(resolve),
      }
      return chain
    })

    const res = await POST(makeRequest())
    expect(res.status).toBe(200)
    expect(updatedData).toMatchObject({ has_xero: false })
  })

  test('returns 200 without processing for duplicate event ID (idempotency)', async () => {
    const subscription = makeSubscription()
    const event = makeEvent('customer.subscription.created', subscription, 'evt_duplicate')
    mockConstructEvent.mockReturnValue(event)

    let updateCalled = false

    mockFrom.mockImplementation((table: string) => {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        is: () => chain,
        // stripe_events already has this event
        maybeSingle: () => Promise.resolve({
          data: { id: 'evt_duplicate' },
          error: null,
        }),
        single: () => Promise.resolve({ data: { stripe_customer_id: null }, error: null }),
        insert: (_data: any) => Promise.resolve({ data: null, error: null }),
        update: (_data: any) => {
          if (table === 'store_plans') updateCalled = true
          return chain
        },
        then: (resolve: any) => Promise.resolve({ data: null, error: null }).then(resolve),
      }
      return chain
    })

    const res = await POST(makeRequest())
    expect(res.status).toBe(200)
    expect(updateCalled).toBe(false)
  })

  test('captures stripe_customer_id on stores table when not already set', async () => {
    const subscription = makeSubscription({ status: 'active' })
    const event = makeEvent('customer.subscription.created', subscription)
    mockConstructEvent.mockReturnValue(event)

    const updateCalls: Array<{ table: string; data: any }> = []

    mockFrom.mockImplementation((table: string) => {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        is: () => chain,
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
        single: () => Promise.resolve({ data: { stripe_customer_id: null }, error: null }),
        insert: (_data: any) => Promise.resolve({ data: null, error: null }),
        update: (data: any) => {
          updateCalls.push({ table, data })
          return chain
        },
        then: (resolve: any) => Promise.resolve({ data: null, error: null }).then(resolve),
      }
      return chain
    })

    const res = await POST(makeRequest())
    expect(res.status).toBe(200)

    const storesUpdate = updateCalls.find(c => c.table === 'stores')
    expect(storesUpdate).toBeDefined()
    expect(storesUpdate?.data).toMatchObject({ stripe_customer_id: 'cus_test_456' })
  })

  test('handles customer.subscription.updated with status=trialing as active', async () => {
    const subscription = makeSubscription({ status: 'trialing' })
    const event = makeEvent('customer.subscription.updated', subscription)
    mockConstructEvent.mockReturnValue(event)

    let updatedData: any = null

    mockFrom.mockImplementation((table: string) => {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        is: () => chain,
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
        single: () => Promise.resolve({ data: { stripe_customer_id: null }, error: null }),
        insert: (_data: any) => Promise.resolve({ data: null, error: null }),
        update: (data: any) => {
          if (table === 'store_plans') updatedData = data
          return chain
        },
        then: (resolve: any) => Promise.resolve({ data: null, error: null }).then(resolve),
      }
      return chain
    })

    const res = await POST(makeRequest())
    expect(res.status).toBe(200)
    expect(updatedData).toMatchObject({ has_xero: true })
  })

  test('falls back to stores table lookup when no store_id in metadata', async () => {
    const subscription = makeSubscription({
      status: 'active',
      metadata: {}, // no store_id
    })
    const event = makeEvent('customer.subscription.created', subscription)
    mockConstructEvent.mockReturnValue(event)

    let storesQueried = false

    mockFrom.mockImplementation((table: string) => {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        is: () => chain,
        maybeSingle: () => {
          if (table === 'stripe_events') return Promise.resolve({ data: null, error: null })
          return Promise.resolve({ data: null, error: null })
        },
        single: () => {
          if (table === 'stores') {
            storesQueried = true
            return Promise.resolve({ data: { id: 'store-from-db', stripe_customer_id: 'cus_test_456' }, error: null })
          }
          return Promise.resolve({ data: { stripe_customer_id: 'cus_test_456' }, error: null })
        },
        insert: (_data: any) => Promise.resolve({ data: null, error: null }),
        update: (_data: any) => chain,
        then: (resolve: any) => Promise.resolve({ data: null, error: null }).then(resolve),
      }
      return chain
    })

    const res = await POST(makeRequest())
    expect(res.status).toBe(200)
    expect(storesQueried).toBe(true)
  })
})
