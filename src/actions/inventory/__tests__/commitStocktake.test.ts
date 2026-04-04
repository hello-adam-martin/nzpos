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
const mockRpc = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    rpc: mockRpc,
  })),
}))

// ---------------------------------------------------------------------------
// Import schema for schema tests
// ---------------------------------------------------------------------------
import { CreateStocktakeSchema } from '@/schemas/inventory'

// ---------------------------------------------------------------------------
// Import the function under test AFTER mocks
// ---------------------------------------------------------------------------
import { commitStocktake } from '../commitStocktake'

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const SESSION_ID = '550e8400-e29b-41d4-a716-446655440000'
const STORE_ID = 'store-123'
const STAFF_ID = 'staff-456'

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireFeature.mockResolvedValue({ authorized: true })
  mockResolveAuth.mockResolvedValue({ store_id: STORE_ID, staff_id: STAFF_ID })
  // RPC returns success by default
  mockRpc.mockResolvedValue({ data: { lines_committed: 5 }, error: null })
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('commitStocktake', () => {
  it('CreateStocktakeSchema rejects invalid scope values (schema used by commitStocktake flow)', () => {
    const result = CreateStocktakeSchema.safeParse({ scope: 'invalid' })
    expect(result.success).toBe(false)
  })

  it('calls requireFeature with inventory and requireDbCheck: true', async () => {
    await commitStocktake({ session_id: SESSION_ID })
    expect(mockRequireFeature).toHaveBeenCalledWith('inventory', { requireDbCheck: true })
  })

  it('calls complete_stocktake RPC with session_id and store_id', async () => {
    await commitStocktake({ session_id: SESSION_ID })
    expect(mockRpc).toHaveBeenCalledWith('complete_stocktake', {
      p_session_id: SESSION_ID,
      p_store_id: STORE_ID,
      p_staff_id: STAFF_ID,
    })
  })

  it('returns lines_committed count on success', async () => {
    const result = await commitStocktake({ session_id: SESSION_ID })
    expect(result).toEqual({ success: true, lines_committed: 5 })
  })

  it('returns invalid_session error when session is not in_progress', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'INVALID_SESSION: session is not in_progress' },
    })
    const result = await commitStocktake({ session_id: SESSION_ID })
    expect(result).toEqual({ error: 'invalid_session' })
  })

  it('returns error when feature not active', async () => {
    mockRequireFeature.mockResolvedValue({
      authorized: false,
      feature: 'inventory',
      upgradeUrl: '/admin/billing?upgrade=inventory',
    })
    const result = await commitStocktake({ session_id: SESSION_ID })
    expect(result).toEqual({ error: 'feature_not_active' })
  })

  it('returns server_error when RPC fails with unexpected error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'connection timeout' } })
    const result = await commitStocktake({ session_id: SESSION_ID })
    expect(result).toEqual({ error: 'server_error' })
  })

  it('returns validation_failed when session_id is not a valid UUID', async () => {
    const result = await commitStocktake({ session_id: 'not-a-uuid' })
    expect(result).toEqual({ error: 'validation_failed' })
  })
})
