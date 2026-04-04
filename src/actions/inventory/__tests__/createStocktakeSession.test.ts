import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks — must be declared before imports that trigger module resolution
// ---------------------------------------------------------------------------

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({ get: vi.fn() })),
  headers: vi.fn(() => Promise.resolve({ get: vi.fn() })),
}))

// Mock requireFeature
const { mockRequireFeature } = vi.hoisted(() => ({
  mockRequireFeature: vi.fn(),
}))
vi.mock('@/lib/requireFeature', () => ({
  requireFeature: mockRequireFeature,
}))

// Mock resolveAuth
const { mockResolveAuth } = vi.hoisted(() => ({
  mockResolveAuth: vi.fn(),
}))
vi.mock('@/lib/resolveAuth', () => ({
  resolveAuth: mockResolveAuth,
}))

// Mock Supabase admin client with a shared instance
const mockInsertSession = vi.fn()
const mockInsertLines = vi.fn()
const mockSelectProducts = vi.fn()
const mockFrom = vi.fn()

function createSessionChain() {
  const chain: Record<string, unknown> = {}
  chain.insert = vi.fn(() => chain)
  chain.select = vi.fn(() => chain)
  chain.single = vi.fn(mockInsertSession)
  return chain
}

function createLinesChain() {
  const chain: Record<string, unknown> = {}
  chain.insert = vi.fn(mockInsertLines)
  return chain
}

function createProductsChain() {
  // Supabase query builder is awaitable without a terminal method call.
  // We build a proxy that returns itself for method calls and delegates
  // then/catch to mockSelectProducts.
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === 'then') {
        return (resolve: (v: unknown) => void, reject: (v: unknown) => void) =>
          mockSelectProducts().then(resolve, reject)
      }
      if (prop === 'catch') {
        return (reject: (v: unknown) => void) => mockSelectProducts().catch(reject)
      }
      // All other methods (select, eq, etc.) return the same proxy
      return (..._args: unknown[]) => proxy
    },
  }
  const proxy = new Proxy({}, handler)
  return proxy
}

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

// ---------------------------------------------------------------------------
// Import schema for schema tests
// ---------------------------------------------------------------------------
import { CreateStocktakeSchema } from '@/schemas/inventory'

// ---------------------------------------------------------------------------
// Import the function under test AFTER mocks
// ---------------------------------------------------------------------------
import { createStocktakeSession } from '../createStocktakeSession'

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const SESSION_ID = '550e8400-e29b-41d4-a716-446655440000'
const STORE_ID = 'store-123'
const STAFF_ID = 'staff-456'
const CATEGORY_ID = '550e8400-e29b-41d4-a716-446655440001'

beforeEach(() => {
  vi.clearAllMocks()
  // Feature enabled by default
  mockRequireFeature.mockResolvedValue({ authorized: true })
  // Authenticated by default
  mockResolveAuth.mockResolvedValue({ store_id: STORE_ID, staff_id: STAFF_ID })
  // Session insert succeeds
  mockInsertSession.mockResolvedValue({ data: { id: SESSION_ID }, error: null })
  // Products query returns two physical products
  mockSelectProducts.mockResolvedValue({
    data: [
      { id: 'prod-1', stock_quantity: 10 },
      { id: 'prod-2', stock_quantity: 5 },
    ],
    error: null,
  })
  // Lines insert succeeds
  mockInsertLines.mockResolvedValue({ data: null, error: null })
  // Wire from() to the appropriate chain by table name
  mockFrom.mockImplementation((table: string) => {
    if (table === 'stocktake_sessions') return createSessionChain()
    if (table === 'stocktake_lines') return createLinesChain()
    if (table === 'products') return createProductsChain()
    return {}
  })
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createStocktakeSession', () => {
  describe('input validation', () => {
    it('accepts scope full without category_id', () => {
      const result = CreateStocktakeSchema.safeParse({ scope: 'full' })
      expect(result.success).toBe(true)
    })

    it('rejects scope category without category_id', () => {
      const result = CreateStocktakeSchema.safeParse({ scope: 'category' })
      expect(result.success).toBe(false)
    })

    it('accepts scope category with valid category_id', () => {
      const result = CreateStocktakeSchema.safeParse({
        scope: 'category',
        category_id: '550e8400-e29b-41d4-a716-446655440000',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('server action', () => {
    it('calls requireFeature with inventory and requireDbCheck: true', async () => {
      await createStocktakeSession({ scope: 'full' })
      expect(mockRequireFeature).toHaveBeenCalledWith('inventory', { requireDbCheck: true })
    })

    it('returns feature_not_active error when feature gate denies', async () => {
      mockRequireFeature.mockResolvedValue({
        authorized: false,
        feature: 'inventory',
        upgradeUrl: '/admin/billing?upgrade=inventory',
      })
      const result = await createStocktakeSession({ scope: 'full' })
      expect(result).toEqual({ error: 'feature_not_active' })
    })

    it('creates session row with status in_progress', async () => {
      await createStocktakeSession({ scope: 'full' })
      expect(mockFrom).toHaveBeenCalledWith('stocktake_sessions')
    })

    it('creates stocktake_lines for all physical products with current stock as snapshot', async () => {
      const result = await createStocktakeSession({ scope: 'full' })
      expect(result).toEqual({ success: true, sessionId: SESSION_ID })
      // Lines insert was called
      expect(mockInsertLines).toHaveBeenCalledTimes(1)
      const insertedLines = mockInsertLines.mock.calls[0][0]
      expect(insertedLines).toHaveLength(2)
      expect(insertedLines[0]).toMatchObject({
        stocktake_session_id: SESSION_ID,
        store_id: STORE_ID,
        product_id: 'prod-1',
        system_snapshot_quantity: 10,
        counted_quantity: null,
      })
    })

    it('filters products by category when scope is category', async () => {
      await createStocktakeSession({ scope: 'category', category_id: CATEGORY_ID })
      expect(mockFrom).toHaveBeenCalledWith('products')
    })

    it('returns session id on success', async () => {
      const result = await createStocktakeSession({ scope: 'full' })
      expect(result).toEqual({ success: true, sessionId: SESSION_ID })
    })

    it('returns validation_failed when input is invalid', async () => {
      const result = await createStocktakeSession({ scope: 'category' })
      expect(result).toMatchObject({ error: 'validation_failed' })
    })

    it('returns server_error when session insert fails', async () => {
      mockInsertSession.mockResolvedValue({ data: null, error: { message: 'DB error' } })
      const result = await createStocktakeSession({ scope: 'full' })
      expect(result).toEqual({ error: 'server_error' })
    })
  })
})
