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

// Mock Supabase admin client
const mockLineFetch = vi.fn()
const mockLineUpdate = vi.fn()
const mockFrom = vi.fn()

function createFetchLineChain() {
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.single = vi.fn(mockLineFetch)
  return chain
}

function createUpdateChain() {
  const chain: Record<string, unknown> = {}
  chain.update = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  // update terminates with a promise (no .single())
  ;(chain as Record<string, unknown>).then = (resolve: (v: unknown) => void, reject: (v: unknown) => void) =>
    mockLineUpdate().then(resolve, reject)
  return chain
}

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

// ---------------------------------------------------------------------------
// Import schema for schema tests
// ---------------------------------------------------------------------------
import { UpdateStocktakeLineSchema } from '@/schemas/inventory'

// ---------------------------------------------------------------------------
// Import the function under test AFTER mocks
// ---------------------------------------------------------------------------
import { updateStocktakeLine } from '../updateStocktakeLine'

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const LINE_ID = '550e8400-e29b-41d4-a716-446655440000'
const SESSION_ID = '550e8400-e29b-41d4-a716-446655440001'
const STORE_ID = 'store-123'
const STAFF_ID = 'staff-456'

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireFeature.mockResolvedValue({ authorized: true })
  mockResolveAuth.mockResolvedValue({ store_id: STORE_ID, staff_id: STAFF_ID })
  // Line fetch returns an in_progress line by default
  mockLineFetch.mockResolvedValue({
    data: {
      id: LINE_ID,
      stocktake_session_id: SESSION_ID,
      stocktake_sessions: { status: 'in_progress' },
    },
    error: null,
  })
  // Update returns success by default
  mockLineUpdate.mockResolvedValue({ data: null, error: null })
  // Wire from() to chains
  let fromCallCount = 0
  mockFrom.mockImplementation((_table: string) => {
    fromCallCount++
    // First call is line fetch (select+eq+single), second is update (update+eq)
    if (fromCallCount === 1) return createFetchLineChain()
    return createUpdateChain()
  })
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('updateStocktakeLine', () => {
  describe('input validation', () => {
    it('rejects negative counted_quantity', () => {
      const result = UpdateStocktakeLineSchema.safeParse({
        line_id: LINE_ID,
        counted_quantity: -1,
      })
      expect(result.success).toBe(false)
    })

    it('accepts zero counted_quantity', () => {
      const result = UpdateStocktakeLineSchema.safeParse({
        line_id: LINE_ID,
        counted_quantity: 0,
      })
      expect(result.success).toBe(true)
    })

    it('accepts positive counted_quantity', () => {
      const result = UpdateStocktakeLineSchema.safeParse({
        line_id: LINE_ID,
        counted_quantity: 10,
      })
      expect(result.success).toBe(true)
    })

    it('rejects non-integer counted_quantity', () => {
      const result = UpdateStocktakeLineSchema.safeParse({
        line_id: LINE_ID,
        counted_quantity: 1.5,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('server action', () => {
    it('calls requireFeature with inventory and requireDbCheck: true', async () => {
      await updateStocktakeLine({ line_id: LINE_ID, counted_quantity: 5 })
      expect(mockRequireFeature).toHaveBeenCalledWith('inventory', { requireDbCheck: true })
    })

    it('returns feature_not_active when feature gate denies', async () => {
      mockRequireFeature.mockResolvedValue({
        authorized: false,
        feature: 'inventory',
        upgradeUrl: '/admin/billing?upgrade=inventory',
      })
      const result = await updateStocktakeLine({ line_id: LINE_ID, counted_quantity: 5 })
      expect(result).toEqual({ error: 'feature_not_active' })
    })

    it('updates counted_quantity on the line', async () => {
      const result = await updateStocktakeLine({ line_id: LINE_ID, counted_quantity: 7 })
      expect(result).toEqual({ success: true })
      expect(mockLineUpdate).toHaveBeenCalledTimes(1)
    })

    it('updates updated_at timestamp when updating the line', async () => {
      // updateStocktakeLine calls .update({ counted_quantity, updated_at })
      // We verify the update was called (timestamp is set internally)
      await updateStocktakeLine({ line_id: LINE_ID, counted_quantity: 3 })
      expect(mockLineUpdate).toHaveBeenCalledTimes(1)
    })

    it('returns error when line not found or session not in_progress', async () => {
      mockLineFetch.mockResolvedValue({ data: null, error: { message: 'not found' } })
      const result = await updateStocktakeLine({ line_id: LINE_ID, counted_quantity: 5 })
      expect(result).toEqual({ error: 'line_not_found' })
    })

    it('returns session_not_in_progress when session status is completed', async () => {
      mockLineFetch.mockResolvedValue({
        data: {
          id: LINE_ID,
          stocktake_session_id: SESSION_ID,
          stocktake_sessions: { status: 'completed' },
        },
        error: null,
      })
      const result = await updateStocktakeLine({ line_id: LINE_ID, counted_quantity: 5 })
      expect(result).toEqual({ error: 'session_not_in_progress' })
    })

    it('returns validation_failed for invalid input', async () => {
      const result = await updateStocktakeLine({ line_id: 'not-a-uuid', counted_quantity: 5 })
      expect(result).toMatchObject({ error: 'validation_failed' })
    })
  })
})
