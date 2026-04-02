import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks — must be declared before imports that trigger module resolution
// ---------------------------------------------------------------------------

vi.mock('server-only', () => ({}))

// Mock resolveAuth (owner + staff auth)
const mockResolveAuth = vi.fn()
vi.mock('@/lib/resolveAuth', () => ({
  resolveAuth: () => mockResolveAuth(),
}))

// Mock Supabase admin client with chainable query builder
function createChain(finalResult: any) {
  const chain: any = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') return undefined // non-thenable
        if (prop === 'single') return () => finalResult
        return (..._args: unknown[]) => chain
      },
    }
  )
  return chain
}

const mockFrom = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    from: (..._args: unknown[]) => mockFrom(),
  }),
}))

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { lookupBarcode } from './lookupBarcode'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const mockProduct = {
  id: 'prod-123',
  store_id: 'store-abc',
  name: 'Widget Pro',
  barcode: '9400012345670',
  price_cents: 1999,
  stock_quantity: 10,
  is_active: true,
  sku: 'WP-001',
  description: null,
  category_id: null,
  image_url: null,
  reorder_threshold: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

describe('lookupBarcode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResolveAuth.mockResolvedValue({
      store_id: 'store-abc',
      staff_id: 'staff-1',
    })
  })

  it('Test 1: returns product when barcode matches an active product', async () => {
    mockFrom.mockReturnValue(createChain({ data: mockProduct, error: null }))

    const result = await lookupBarcode('9400012345670')

    expect(result).toEqual({ product: mockProduct })
    expect(mockFrom).toHaveBeenCalled()
  })

  it('Test 2: returns not_found error when barcode does not match any product', async () => {
    mockFrom.mockReturnValue(createChain({ data: null, error: { code: 'PGRST116', message: 'No rows found' } }))

    const result = await lookupBarcode('9999999999999')

    expect(result).toEqual({ error: 'not_found' })
  })

  it('Test 3: returns invalid_barcode for empty string input', async () => {
    const result = await lookupBarcode('')

    expect(result).toEqual({ error: 'invalid_barcode' })
    // Should not hit the database
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('Test 3b: returns invalid_barcode for non-numeric barcode input', async () => {
    const result = await lookupBarcode('NOT-A-BARCODE')

    expect(result).toEqual({ error: 'invalid_barcode' })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('Test 4: returns not_authenticated when staff session is missing', async () => {
    mockResolveAuth.mockResolvedValue(null)

    const result = await lookupBarcode('9400012345670')

    expect(result).toEqual({ error: 'not_authenticated' })
    // Should not hit the database
    expect(mockFrom).not.toHaveBeenCalled()
  })
})
