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

// Mock Supabase admin client
const mockRpc = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    rpc: mockRpc,
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
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('completeSale', () => {
  it('returns not-authenticated error when staff_session cookie is missing', async () => {
    mockGet.mockReturnValue(undefined)
    const result = await completeSale(validOrderInput)
    expect(result).toEqual({ error: 'Not authenticated — please log in again' })
  })

  it('returns not-authenticated error when JWT is invalid', async () => {
    mockGet.mockReturnValue({ value: 'bad-token' })
    mockJwtVerify.mockRejectedValue(new Error('Invalid JWT'))
    const result = await completeSale(validOrderInput)
    expect(result).toEqual({ error: 'Not authenticated — please log in again' })
  })

  it('returns invalid order data error when input is missing required fields', async () => {
    mockGet.mockReturnValue({ value: 'valid-token' })
    mockJwtVerify.mockResolvedValue({
      payload: { role: 'staff', store_id: 'store-1', staff_id: 'staff-1' },
    })
    // Missing 'items' field — Zod should reject
    const result = await completeSale({ channel: 'pos', status: 'completed', subtotal_cents: 1000, gst_cents: 130, total_cents: 1000 })
    expect(result).toHaveProperty('error', 'Invalid order data')
    expect(result).toHaveProperty('details')
  })

  it('returns success with orderId when RPC succeeds', async () => {
    mockGet.mockReturnValue({ value: 'valid-token' })
    mockJwtVerify.mockResolvedValue({
      payload: { role: 'staff', store_id: 'store-1', staff_id: 'staff-1' },
    })
    mockRpc.mockResolvedValue({ data: { order_id: 'order-123' }, error: null })

    const result = await completeSale(validOrderInput)
    expect(result).toEqual({ success: true, orderId: 'order-123' })
  })

  it('returns out_of_stock error when RPC raises OUT_OF_STOCK', async () => {
    mockGet.mockReturnValue({ value: 'valid-token' })
    mockJwtVerify.mockResolvedValue({
      payload: { role: 'staff', store_id: 'store-1', staff_id: 'staff-1' },
    })
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
    mockGet.mockReturnValue({ value: 'valid-token' })
    mockJwtVerify.mockResolvedValue({
      payload: { role: 'staff', store_id: 'store-1', staff_id: 'staff-1' },
    })
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'PRODUCT_NOT_FOUND:prod-xyz' },
    })

    const result = await completeSale(validOrderInput)
    expect(result).toHaveProperty('error', 'product_not_found')
    expect(result).toHaveProperty('productId', 'prod-xyz')
  })

  it('returns generic user-friendly error for unrecognised RPC errors', async () => {
    mockGet.mockReturnValue({ value: 'valid-token' })
    mockJwtVerify.mockResolvedValue({
      payload: { role: 'staff', store_id: 'store-1', staff_id: 'staff-1' },
    })
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'some random database error' },
    })

    const result = await completeSale(validOrderInput)
    expect(result).toHaveProperty('error')
    expect((result as { error: string }).error).toContain('Sale could not be recorded')
  })
})
