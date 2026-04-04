import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AdjustStockSchema } from '@/schemas/inventory'

// Mock server-only modules before importing the action
vi.mock('server-only', () => ({}))
vi.mock('@/lib/requireFeature', () => ({
  requireFeature: vi.fn(),
}))
vi.mock('@/lib/resolveAuth', () => ({
  resolveAuth: vi.fn(),
}))
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(),
}))

import { requireFeature } from '@/lib/requireFeature'
import { resolveAuth } from '@/lib/resolveAuth'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { adjustStock } from '../adjustStock'

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000'
const VALID_INPUT = {
  product_id: VALID_UUID,
  quantity_delta: 5,
  reason: 'received' as const,
}

/**
 * Wave 0 scaffold for adjustStock server action tests.
 * Non-todo tests validate Zod schema inputs (schema exists from Plan 01).
 * Server action behavior tests are stubs — filled in when adjustStock.ts is implemented in Plan 02.
 */
describe('adjustStock', () => {
  describe('input validation', () => {
    it('rejects invalid product_id', () => {
      const result = AdjustStockSchema.safeParse({
        product_id: 'not-a-uuid',
        quantity_delta: 5,
        reason: 'received',
      })
      expect(result.success).toBe(false)
    })

    it('rejects non-integer quantity_delta', () => {
      const result = AdjustStockSchema.safeParse({
        product_id: '550e8400-e29b-41d4-a716-446655440000',
        quantity_delta: 1.5,
        reason: 'received',
      })
      expect(result.success).toBe(false)
    })

    it('rejects system reason codes (sale, refund, stocktake)', () => {
      for (const reason of ['sale', 'refund', 'stocktake']) {
        const result = AdjustStockSchema.safeParse({
          product_id: '550e8400-e29b-41d4-a716-446655440000',
          quantity_delta: 5,
          reason,
        })
        expect(result.success).toBe(false)
      }
    })

    it('accepts valid manual reason codes', () => {
      for (const reason of [
        'received',
        'damaged',
        'theft_shrinkage',
        'correction',
        'return_to_supplier',
        'other',
      ]) {
        const result = AdjustStockSchema.safeParse({
          product_id: '550e8400-e29b-41d4-a716-446655440000',
          quantity_delta: 1,
          reason,
        })
        expect(result.success).toBe(true)
      }
    })

    it('accepts optional notes up to 500 chars', () => {
      const result = AdjustStockSchema.safeParse({
        product_id: '550e8400-e29b-41d4-a716-446655440000',
        quantity_delta: 5,
        reason: 'received',
        notes: 'a'.repeat(500),
      })
      expect(result.success).toBe(true)
    })
  })

  describe('server action', () => {
    const mockRequireFeature = vi.mocked(requireFeature)
    const mockResolveAuth = vi.mocked(resolveAuth)
    const mockCreateAdminClient = vi.mocked(createSupabaseAdminClient)

    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('calls requireFeature with inventory and requireDbCheck: true', async () => {
      mockRequireFeature.mockResolvedValue({ authorized: false, feature: 'inventory', upgradeUrl: '/admin/billing?upgrade=inventory' })

      await adjustStock(VALID_INPUT)

      expect(mockRequireFeature).toHaveBeenCalledWith('inventory', { requireDbCheck: true })
    })

    it('returns error when feature not active', async () => {
      mockRequireFeature.mockResolvedValue({ authorized: false, feature: 'inventory', upgradeUrl: '/admin/billing?upgrade=inventory' })

      const result = await adjustStock(VALID_INPUT)

      expect(result).toEqual({ error: 'feature_not_active' })
    })

    it('calls adjust_stock RPC with correct parameters', async () => {
      mockRequireFeature.mockResolvedValue({ authorized: true })
      mockResolveAuth.mockResolvedValue({ store_id: 'store-123', staff_id: 'staff-456' })
      const mockRpc = vi.fn().mockResolvedValue({ data: { new_quantity: 15 }, error: null })
      mockCreateAdminClient.mockReturnValue({ rpc: mockRpc } as any)

      await adjustStock(VALID_INPUT)

      expect(mockRpc).toHaveBeenCalledWith('adjust_stock', {
        p_store_id: 'store-123',
        p_product_id: VALID_UUID,
        p_quantity_delta: 5,
        p_reason: 'received',
        p_notes: null,
        p_staff_id: 'staff-456',
      })
    })

    it('returns new_quantity on success', async () => {
      mockRequireFeature.mockResolvedValue({ authorized: true })
      mockResolveAuth.mockResolvedValue({ store_id: 'store-123', staff_id: 'staff-456' })
      const mockRpc = vi.fn().mockResolvedValue({ data: { new_quantity: 20 }, error: null })
      mockCreateAdminClient.mockReturnValue({ rpc: mockRpc } as any)

      const result = await adjustStock(VALID_INPUT)

      expect(result).toEqual({ success: true, new_quantity: 20 })
    })

    it('returns error when product not found', async () => {
      mockRequireFeature.mockResolvedValue({ authorized: true })
      mockResolveAuth.mockResolvedValue({ store_id: 'store-123', staff_id: 'staff-456' })
      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'PRODUCT_NOT_FOUND: product does not exist' },
      })
      mockCreateAdminClient.mockReturnValue({ rpc: mockRpc } as any)

      const result = await adjustStock(VALID_INPUT)

      expect(result).toEqual({ error: 'product_not_found' })
    })
  })
})
