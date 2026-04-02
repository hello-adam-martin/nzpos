import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks — must be declared before imports that trigger module resolution
// ---------------------------------------------------------------------------

vi.mock('server-only', () => ({}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock Supabase server client (owner auth)
const mockGetUser = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: () =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
    }),
}))

// Mock Supabase admin client with chainable query builder
const mockRpc = vi.fn()
let fromCallIndex = 0
const fromResults: any[] = []

function pushFromResult(result: any) {
  fromResults.push(result)
}

function createQueryChain(resultFn: () => any) {
  const chain: any = new Proxy({}, {
    get(_target, prop) {
      if (prop === 'then') return undefined // Make chain non-thenable so await resolves immediately
      if (prop === 'single') {
        return () => resultFn()
      }
      // All other methods return the chain
      return (..._args: any[]) => chain
    },
  })
  return chain
}

const mockFrom = vi.fn(() => {
  const idx = fromCallIndex++
  return createQueryChain(() => fromResults[idx] ?? { data: null, error: null })
})

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    from: (..._args: unknown[]) => mockFrom(),
    rpc: mockRpc,
  }),
}))

// Mock Stripe
const mockRefundCreate = vi.fn()
vi.mock('@/lib/stripe', () => ({
  stripe: {
    refunds: { create: (...args: any[]) => mockRefundCreate(...args) },
  },
}))

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import { processRefund } from '../processRefund'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const validInput = {
  orderId: 'a1b2c3d4-e5f6-4890-abcd-ef1234567890',
  reason: 'customer_request' as const,
  restoreStock: true,
}

function mockOwnerAuth(storeId = 'store-1') {
  mockGetUser.mockResolvedValue({
    data: { user: { id: 'owner-1', app_metadata: { store_id: storeId } } },
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
  fromCallIndex = 0
  fromResults.length = 0
})

describe('processRefund', () => {
  it('returns not-authenticated error when no user session', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const result = await processRefund(validInput)
    expect(result).toEqual({ error: 'Not authenticated' })
  })

  it('returns invalid input for malformed data', async () => {
    mockOwnerAuth()
    const result = await processRefund({ orderId: 'not-a-uuid' })
    expect(result).toEqual({ error: 'Invalid input' })
  })

  it('rejects already-refunded order', async () => {
    mockOwnerAuth()
    // from('orders').select().eq().eq().single() — fetch order
    pushFromResult({
      data: { id: validInput.orderId, status: 'refunded', channel: 'pos' },
    })

    const result = await processRefund(validInput)
    expect(result).toEqual({ error: 'Order already refunded' })
  })

  it('refunds POS order without Stripe call', async () => {
    mockOwnerAuth()
    // 1st from: fetch order
    pushFromResult({
      data: {
        id: validInput.orderId,
        status: 'completed',
        channel: 'pos',
        order_items: [{ product_id: 'prod-1', quantity: 2 }],
      },
    })
    // 2nd from: optimistic lock update
    pushFromResult({ data: { id: validInput.orderId } })

    mockRpc.mockResolvedValue({ error: null })

    const result = await processRefund(validInput)
    expect(result).toEqual({ success: true })
    expect(mockRefundCreate).not.toHaveBeenCalled()
    expect(mockRpc).toHaveBeenCalledWith('restore_stock', {
      p_product_id: 'prod-1',
      p_quantity: 2,
    })
  })

  it('refunds online order via Stripe refunds API', async () => {
    mockOwnerAuth()
    // 1st from: fetch order
    pushFromResult({
      data: {
        id: validInput.orderId,
        status: 'completed',
        channel: 'online',
        stripe_payment_intent_id: 'pi_123',
        total_cents: 5000,
        order_items: [],
      },
    })
    // 2nd from: optimistic lock
    pushFromResult({ data: { id: validInput.orderId } })
    // 3rd from: stripe_refund_id update (no .single() call, just chained)
    pushFromResult({ data: null })

    mockRefundCreate.mockResolvedValue({ id: 're_456', status: 'succeeded' })

    const result = await processRefund({ ...validInput, restoreStock: false })
    expect(result).toEqual({ success: true })
    expect(mockRefundCreate).toHaveBeenCalledWith({
      payment_intent: 'pi_123',
      amount: 5000,
    })
  })

  it('does not restore stock when restoreStock is false', async () => {
    mockOwnerAuth()
    // 1st from: fetch order
    pushFromResult({
      data: {
        id: validInput.orderId,
        status: 'completed',
        channel: 'pos',
        order_items: [{ product_id: 'prod-1', quantity: 1 }],
      },
    })
    // 2nd from: optimistic lock
    pushFromResult({ data: { id: validInput.orderId } })

    const result = await processRefund({ ...validInput, restoreStock: false })
    expect(result).toEqual({ success: true })
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('requires a valid refund reason', async () => {
    mockOwnerAuth()
    const result = await processRefund({
      orderId: validInput.orderId,
      reason: 'invalid_reason',
      restoreStock: true,
    })
    expect(result).toEqual({ error: 'Invalid input' })
  })
})
