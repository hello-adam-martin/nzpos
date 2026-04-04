import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ALL_REASON_CODES } from '@/schemas/inventory'

// Mock server-only modules before importing the action
vi.mock('server-only', () => ({}))
vi.mock('@/lib/resolveAuth', () => ({
  resolveAuth: vi.fn(),
}))
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}))

import { resolveAuth } from '@/lib/resolveAuth'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getAdjustmentHistory } from '../getAdjustmentHistory'

const PRODUCT_UUID = '550e8400-e29b-41d4-a716-446655440001'

/**
 * Build a fully-chainable Supabase query mock.
 * Every method returns `this` (the same object), so the chain can be
 * arbitrarily long. The object is also thenable — when the action awaits
 * it, the resolved value is { data, error, count }.
 */
function buildChainableMock(resolvedValue: { data: unknown; error: unknown; count: number }) {
  const mock: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'order', 'range', 'gte', 'lte']
  for (const method of methods) {
    mock[method] = vi.fn().mockReturnValue(mock)
  }
  // Make it thenable so `await query` works
  mock.then = (onFulfilled: (v: unknown) => void) => Promise.resolve(resolvedValue).then(onFulfilled)
  return mock
}

/**
 * Wave 0 scaffold for getAdjustmentHistory server action tests.
 * Non-todo tests validate schema constants used for filtering.
 * Server action behavior tests are stubs — filled in when getAdjustmentHistory.ts is implemented in Plan 02.
 */
describe('getAdjustmentHistory', () => {
  it('ALL_REASON_CODES includes both manual and system codes for filter UI', () => {
    // The filter dropdown shows all reason codes including system ones
    expect(ALL_REASON_CODES).toContain('received')
    expect(ALL_REASON_CODES).toContain('sale')
    expect(ALL_REASON_CODES).toContain('stocktake')
    expect(ALL_REASON_CODES.length).toBe(9)
  })

  describe('server action', () => {
    const mockResolveAuth = vi.mocked(resolveAuth)
    const mockCreateServerClient = vi.mocked(createSupabaseServerClient)

    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('returns paginated adjustment rows ordered by created_at desc', async () => {
      mockResolveAuth.mockResolvedValue({ store_id: 'store-123', staff_id: 'staff-456' })

      const rows = [
        { id: 'adj-1', product_id: PRODUCT_UUID, quantity_delta: 5, reason: 'received', created_at: '2026-04-04T08:00:00Z', products: { name: 'Widget', sku: 'WG-001' } },
        { id: 'adj-2', product_id: PRODUCT_UUID, quantity_delta: -2, reason: 'damaged', created_at: '2026-04-03T08:00:00Z', products: { name: 'Widget', sku: 'WG-001' } },
      ]

      const queryMock = buildChainableMock({ data: rows, error: null, count: 2 })
      const fromMock = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue(queryMock) })
      mockCreateServerClient.mockResolvedValue({ from: fromMock } as any)

      const result = await getAdjustmentHistory()

      expect(result).toMatchObject({ success: true, rows, total: 2, page: 1, pageSize: 50 })
    })

    it('filters by product_id when provided', async () => {
      mockResolveAuth.mockResolvedValue({ store_id: 'store-123', staff_id: 'staff-456' })

      const queryMock = buildChainableMock({ data: [], error: null, count: 0 })
      const fromMock = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue(queryMock) })
      mockCreateServerClient.mockResolvedValue({ from: fromMock } as any)

      await getAdjustmentHistory({ productId: PRODUCT_UUID })

      // Verify .eq('product_id', ...) was called on the query chain
      const eqMock = vi.mocked(queryMock.eq as ReturnType<typeof vi.fn>)
      const calls = eqMock.mock.calls
      expect(calls).toContainEqual(['product_id', PRODUCT_UUID])
    })

    it('filters by date range when fromDate and toDate provided', async () => {
      mockResolveAuth.mockResolvedValue({ store_id: 'store-123', staff_id: 'staff-456' })

      const queryMock = buildChainableMock({ data: [], error: null, count: 0 })
      const fromMock = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue(queryMock) })
      mockCreateServerClient.mockResolvedValue({ from: fromMock } as any)

      await getAdjustmentHistory({ fromDate: '2026-04-01', toDate: '2026-04-04' })

      const gteMock = vi.mocked(queryMock.gte as ReturnType<typeof vi.fn>)
      const lteMock = vi.mocked(queryMock.lte as ReturnType<typeof vi.fn>)
      expect(gteMock).toHaveBeenCalledWith('created_at', '2026-04-01')
      expect(lteMock).toHaveBeenCalledWith('created_at', '2026-04-04')
    })

    it('filters by reason code when provided', async () => {
      mockResolveAuth.mockResolvedValue({ store_id: 'store-123', staff_id: 'staff-456' })

      const queryMock = buildChainableMock({ data: [], error: null, count: 0 })
      const fromMock = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue(queryMock) })
      mockCreateServerClient.mockResolvedValue({ from: fromMock } as any)

      await getAdjustmentHistory({ reason: 'damaged' })

      const eqMock = vi.mocked(queryMock.eq as ReturnType<typeof vi.fn>)
      const calls = eqMock.mock.calls
      expect(calls).toContainEqual(['reason', 'damaged'])
    })

    it('returns empty array when no matching rows', async () => {
      mockResolveAuth.mockResolvedValue({ store_id: 'store-123', staff_id: 'staff-456' })

      const queryMock = buildChainableMock({ data: [], error: null, count: 0 })
      const fromMock = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue(queryMock) })
      mockCreateServerClient.mockResolvedValue({ from: fromMock } as any)

      const result = await getAdjustmentHistory()

      expect(result).toMatchObject({ success: true, rows: [], total: 0 })
    })

    it('includes product name and sku via join', async () => {
      mockResolveAuth.mockResolvedValue({ store_id: 'store-123', staff_id: 'staff-456' })

      const rows = [
        { id: 'adj-1', products: { name: 'Widget', sku: 'WG-001' } },
      ]
      const queryMock = buildChainableMock({ data: rows, error: null, count: 1 })
      const selectMock = vi.fn().mockReturnValue(queryMock)
      const fromMock = vi.fn().mockReturnValue({ select: selectMock })
      mockCreateServerClient.mockResolvedValue({ from: fromMock } as any)

      const result = await getAdjustmentHistory()

      expect(result).toMatchObject({ success: true })
      if (result.success) {
        expect(result.rows[0]).toMatchObject({ products: { name: 'Widget', sku: 'WG-001' } })
      }
      // Verify join was requested in the select call
      expect(selectMock).toHaveBeenCalledWith('*, products(name, sku)', { count: 'exact' })
    })
  })
})
