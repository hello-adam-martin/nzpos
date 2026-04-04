import { describe, it, expect } from 'vitest'
import { ALL_REASON_CODES } from '@/schemas/inventory'

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

  it.todo('returns paginated adjustment rows ordered by created_at desc')
  it.todo('filters by product_id when provided')
  it.todo('filters by date range when fromDate and toDate provided')
  it.todo('filters by reason code when provided')
  it.todo('returns empty array when no matching rows')
  it.todo('includes product name and sku via join')
})
