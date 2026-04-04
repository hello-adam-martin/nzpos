import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks — must be declared before imports that trigger module resolution
// ---------------------------------------------------------------------------

// Mock server-only to be a no-op (avoids "server-only" guard error in test env)
vi.mock('server-only', () => ({}))

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock next/headers
const mockGet = vi.fn()
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({ get: mockGet })),
}))

// Mock jose jwtVerify
const mockJwtVerify = vi.fn()
vi.mock('jose', () => ({
  jwtVerify: (...args: unknown[]) => mockJwtVerify(...args),
}))

// Mock resolveAuth so tests control auth state without live JWT/cookie machinery
const { mockResolveStaffAuth } = vi.hoisted(() => ({
  mockResolveStaffAuth: vi.fn(),
}))
vi.mock('@/lib/resolveAuth', () => ({
  resolveStaffAuth: mockResolveStaffAuth,
  resolveAuth: mockResolveStaffAuth,
}))

// Mock Supabase admin client
const mockRpc = vi.fn()
const mockFromResult = vi.fn()

function createChain(terminal: () => unknown) {
  const chain: Record<string, unknown> = {}
  const self = () => chain
  chain.select = vi.fn(self)
  chain.eq = vi.fn(self)
  chain.single = vi.fn(terminal)
  chain.update = vi.fn(self)
  return chain
}

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    rpc: mockRpc,
    from: vi.fn((table: string) => {
      if (table === 'staff') {
        return createChain(() => Promise.resolve({ data: { name: 'Alice' }, error: null }))
      }
      if (table === 'stores') {
        return createChain(() =>
          Promise.resolve({ data: { name: 'Test Store', address: null, phone: null, gst_number: null }, error: null })
        )
      }
      // orders table (update call)
      return createChain(() => Promise.resolve({ data: null, error: null }))
    }),
  }),
}))

// ---------------------------------------------------------------------------
// Import the function under test AFTER mocks
// ---------------------------------------------------------------------------
import { completeSale } from '../completeSale'

// ---------------------------------------------------------------------------
// Valid order payload for reuse across tests
// ---------------------------------------------------------------------------
const validOrderInput = {
  channel: 'pos',
  status: 'completed',
  items: [
    {
      product_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      product_name: 'Widget',
      unit_price_cents: 1000,
      quantity: 1,
      discount_cents: 0,
      line_total_cents: 1000,
      gst_cents: 130,
    },
  ],
  subtotal_cents: 1000,
  gst_cents: 130,
  total_cents: 1000,
  discount_cents: 0,
  payment_method: 'eftpos',
}

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
  // Default: authenticated as staff for tests that need auth
  mockResolveStaffAuth.mockResolvedValue({
    store_id: 'store-1',
    staff_id: 'staff-1',
    role: 'staff',
  })
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('completeSale', () => {
  it('returns not-authenticated error when staff_session cookie is missing', async () => {
    mockResolveStaffAuth.mockResolvedValue(null)
    const result = await completeSale(validOrderInput)
    expect(result).toEqual({ error: 'Not authenticated — please log in again' })
  })

  it('returns not-authenticated error when JWT is invalid', async () => {
    mockResolveStaffAuth.mockResolvedValue(null)
    const result = await completeSale(validOrderInput)
    expect(result).toEqual({ error: 'Not authenticated — please log in again' })
  })

  it('returns invalid order data error when input is missing required fields', async () => {
    // Missing 'items' field — Zod should reject
    const result = await completeSale({ channel: 'pos', status: 'completed', subtotal_cents: 1000, gst_cents: 130, total_cents: 1000 })
    expect(result).toHaveProperty('error', 'Invalid order data')
    expect(result).toHaveProperty('details')
  })

  it('returns success with orderId when RPC succeeds', async () => {
    mockRpc.mockResolvedValue({ data: { order_id: 'order-123' }, error: null })

    const result = await completeSale(validOrderInput)
    expect(result).toHaveProperty('success', true)
    expect(result).toHaveProperty('orderId', 'order-123')
    expect(result).toHaveProperty('receiptData')
  })

  it('returns out_of_stock error when RPC raises OUT_OF_STOCK', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'OUT_OF_STOCK:prod-abc:Widget has only 2 units' },
    })

    const result = await completeSale(validOrderInput)
    expect(result).toHaveProperty('error', 'out_of_stock')
    expect(result).toHaveProperty('productId', 'prod-abc')
    expect(result).toHaveProperty('message')
  })

  it('returns product_not_found error when RPC raises PRODUCT_NOT_FOUND', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'PRODUCT_NOT_FOUND:prod-xyz' },
    })

    const result = await completeSale(validOrderInput)
    expect(result).toHaveProperty('error', 'product_not_found')
    expect(result).toHaveProperty('productId', 'prod-xyz')
  })

  it('returns generic user-friendly error for unrecognised RPC errors', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'some random database error' },
    })

    const result = await completeSale(validOrderInput)
    expect(result).toHaveProperty('error')
    expect((result as { error: string }).error).toContain('Sale could not be recorded')
  })
})
