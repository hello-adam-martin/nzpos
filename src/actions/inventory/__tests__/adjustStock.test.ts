import { describe, it, expect } from 'vitest'
import { AdjustStockSchema } from '@/schemas/inventory'

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
    it.todo('calls requireFeature with inventory and requireDbCheck: true')
    it.todo('calls adjust_stock RPC with correct parameters')
    it.todo('returns new_quantity on success')
    it.todo('returns error when feature not active')
    it.todo('returns error when product not found')
  })
})
