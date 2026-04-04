import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks — must be declared before imports that trigger module resolution
// ---------------------------------------------------------------------------

vi.mock('server-only', () => ({}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock resolveAuth so tests control auth state without live JWT/cookie machinery
const { mockResolveStaffAuth } = vi.hoisted(() => ({
  mockResolveStaffAuth: vi.fn(),
}))
vi.mock('@/lib/resolveAuth', () => ({
  resolveStaffAuth: mockResolveStaffAuth,
  resolveAuth: mockResolveStaffAuth,
}))

// Mock sendEmail
const mockSendEmail = vi.fn()
vi.mock('@/lib/email', () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}))

// Mock PickupReadyEmail
vi.mock('@/emails/PickupReadyEmail', () => ({
  PickupReadyEmail: (props: unknown) => props,
}))

// ---------------------------------------------------------------------------
// Supabase admin mock
// ---------------------------------------------------------------------------

type ChainResult = { data: unknown; error: unknown }

// Build a flexible thenable query chain:
// - select/eq/update/single return the chain for chaining
// - the chain itself is thenable (awaitable) returning the result
// - single() overrides the thenable to call the resultFn
function buildChain(resultFn: () => Promise<ChainResult>) {
  let resolvedFn = resultFn
  const chain: Record<string, unknown> = {
    // Make the chain awaitable by default (for .update().eq() pattern with no .single())
    then: (resolve: (v: ChainResult) => void) => resultFn().then(resolve),
    catch: (reject: (e: unknown) => void) => resultFn().catch(reject),
  }
  const self = () => chain
  chain.select = vi.fn(self)
  chain.eq = vi.fn(self)
  chain.update = vi.fn(self)
  chain.single = vi.fn(() => resolvedFn())
  return chain
}

// Sequential from() responses
const mockFromSequence: Array<() => Promise<ChainResult>> = []
let fromCallIdx = 0

const mockFrom = vi.fn((_table: string) => {
  const resultFn = mockFromSequence[fromCallIdx++] ?? (() => Promise.resolve({ data: null, error: null }))
  return buildChain(resultFn)
})

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    from: (table: string) => mockFrom(table),
  }),
}))

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import { updateOrderStatus } from '../updateOrderStatus'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ORDER_ID = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890'
const STORE_ID = 'store-uuid-1234'

function mockStaffAuth(storeId = STORE_ID) {
  mockResolveStaffAuth.mockResolvedValue({ store_id: storeId, staff_id: 'staff-1', role: 'staff' })
}

// Helper: push a result for a from() call whose chain ends in .single()
function pushSingle(data: unknown, error: unknown = null) {
  mockFromSequence.push(() => Promise.resolve({ data, error }))
}

beforeEach(() => {
  vi.clearAllMocks()
  fromCallIdx = 0
  mockFromSequence.length = 0
  mockSendEmail.mockResolvedValue({ success: true })
  // Default: authenticated as staff; tests that need unauthenticated state override this
  mockResolveStaffAuth.mockResolvedValue({ store_id: STORE_ID, staff_id: 'staff-1', role: 'staff' })
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('updateOrderStatus — pickup-ready email (NOTIF-03)', () => {
  it('sends pickup-ready email when newStatus is ready and order has customer_email', async () => {
    mockStaffAuth()

    // 1. orders.select (fetch current order status) — ends in .single()
    pushSingle({ id: ORDER_ID, status: 'pending_pickup', store_id: STORE_ID, channel: 'online' })
    // 2. orders.update (status change) — awaited directly (no .single()), chain is thenable
    pushSingle({ data: null, error: null } as unknown)
    // 3. orders.select (fetch for email — customer_email + order_items) — ends in .single()
    pushSingle({
      customer_email: 'customer@example.com',
      order_items: [{ quantity: 2, products: { name: 'Widget' } }],
    })
    // 4. stores.select (fetch store for email) — ends in .single()
    pushSingle({
      name: 'Test Store',
      address: '1 Main St',
      phone: '09 123 4567',
      opening_hours: 'Mon-Fri 9am-5pm',
    })

    const result = await updateOrderStatus({ orderId: ORDER_ID, newStatus: 'ready' })

    expect(result).toEqual({ success: true, newStatus: 'ready' })
    expect(mockSendEmail).toHaveBeenCalledOnce()
    const callArgs = mockSendEmail.mock.calls[0][0]
    expect(callArgs.to).toBe('customer@example.com')
    expect(callArgs.subject).toBe('Your order is ready for pickup')
  })

  it('does NOT send email when newStatus is ready but order has no customer_email', async () => {
    mockStaffAuth()

    pushSingle({ id: ORDER_ID, status: 'pending_pickup', store_id: STORE_ID, channel: 'online' })
    // update slot
    pushSingle({ data: null, error: null } as unknown)
    // fetch order for email — no customer_email
    pushSingle({ customer_email: null, order_items: [] })

    const result = await updateOrderStatus({ orderId: ORDER_ID, newStatus: 'ready' })

    expect(result).toEqual({ success: true, newStatus: 'ready' })
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('does NOT send email when newStatus is not ready (e.g., collected)', async () => {
    mockStaffAuth()

    // ready -> collected transition
    pushSingle({ id: ORDER_ID, status: 'ready', store_id: STORE_ID, channel: 'online' })
    // update slot
    pushSingle({ data: null, error: null } as unknown)

    const result = await updateOrderStatus({ orderId: ORDER_ID, newStatus: 'collected' })

    expect(result).toEqual({ success: true, newStatus: 'collected' })
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('does NOT send email when newStatus is pending_pickup', async () => {
    mockStaffAuth()

    pushSingle({ id: ORDER_ID, status: 'completed', store_id: STORE_ID, channel: 'online' })
    // update slot
    pushSingle({ data: null, error: null } as unknown)

    const result = await updateOrderStatus({ orderId: ORDER_ID, newStatus: 'pending_pickup' })

    expect(result).toEqual({ success: true, newStatus: 'pending_pickup' })
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('returns error when not authenticated', async () => {
    mockResolveStaffAuth.mockResolvedValue(null)

    const result = await updateOrderStatus({ orderId: ORDER_ID, newStatus: 'ready' })

    expect(result).toEqual({ error: 'Not authenticated' })
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('returns error for invalid status transition', async () => {
    mockStaffAuth()

    // Current status is "collected" — no further transitions allowed
    pushSingle({ id: ORDER_ID, status: 'collected', store_id: STORE_ID, channel: 'online' })

    const result = await updateOrderStatus({ orderId: ORDER_ID, newStatus: 'ready' })

    expect(result).toEqual({
      error: expect.stringContaining('Invalid status transition'),
    })
    expect(mockSendEmail).not.toHaveBeenCalled()
  })
})
