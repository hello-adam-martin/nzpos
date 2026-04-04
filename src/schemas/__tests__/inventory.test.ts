import { describe, it, expect } from 'vitest'
import {
  MANUAL_REASON_CODES,
  SYSTEM_REASON_CODES,
  ALL_REASON_CODES,
  REASON_CODE_LABELS,
  AdjustStockSchema,
  CreateStocktakeSchema,
  UpdateStocktakeLineSchema,
} from '@/schemas/inventory'

describe('Reason code constants', () => {
  it('MANUAL_REASON_CODES contains exactly the expected codes', () => {
    expect(MANUAL_REASON_CODES).toEqual([
      'received',
      'damaged',
      'theft_shrinkage',
      'correction',
      'return_to_supplier',
      'other',
    ])
  })

  it('SYSTEM_REASON_CODES contains exactly the expected codes', () => {
    expect(SYSTEM_REASON_CODES).toEqual(['sale', 'refund', 'stocktake'])
  })

  it('ALL_REASON_CODES is the union of both arrays', () => {
    expect(ALL_REASON_CODES).toEqual([
      ...MANUAL_REASON_CODES,
      ...SYSTEM_REASON_CODES,
    ])
  })

  it('REASON_CODE_LABELS maps each code to its display label', () => {
    expect(REASON_CODE_LABELS['received']).toBe('Received stock')
    expect(REASON_CODE_LABELS['damaged']).toBe('Damaged')
    expect(REASON_CODE_LABELS['theft_shrinkage']).toBe('Theft / shrinkage')
    expect(REASON_CODE_LABELS['correction']).toBe('Correction')
    expect(REASON_CODE_LABELS['return_to_supplier']).toBe('Return to supplier')
    expect(REASON_CODE_LABELS['other']).toBe('Other')
    expect(REASON_CODE_LABELS['sale']).toBe('Sale (system)')
    expect(REASON_CODE_LABELS['refund']).toBe('Refund (system)')
    expect(REASON_CODE_LABELS['stocktake']).toBe('Stocktake (system)')
  })

  it('REASON_CODE_LABELS covers all reason codes', () => {
    for (const code of ALL_REASON_CODES) {
      expect(REASON_CODE_LABELS).toHaveProperty(code)
    }
  })
})

describe('AdjustStockSchema', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000'

  it('accepts valid input with all fields', () => {
    const result = AdjustStockSchema.safeParse({
      product_id: validUuid,
      quantity_delta: 5,
      reason: 'received',
      notes: 'delivery',
    })
    expect(result.success).toBe(true)
  })

  it('accepts notes as optional (undefined)', () => {
    const result = AdjustStockSchema.safeParse({
      product_id: validUuid,
      quantity_delta: 5,
      reason: 'received',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid reason code that is system-only (sale)', () => {
    const result = AdjustStockSchema.safeParse({
      product_id: validUuid,
      quantity_delta: 5,
      reason: 'sale',
    })
    expect(result.success).toBe(false)
  })

  it('rejects system reason code: refund', () => {
    const result = AdjustStockSchema.safeParse({
      product_id: validUuid,
      quantity_delta: 5,
      reason: 'refund',
    })
    expect(result.success).toBe(false)
  })

  it('rejects system reason code: stocktake', () => {
    const result = AdjustStockSchema.safeParse({
      product_id: validUuid,
      quantity_delta: 5,
      reason: 'stocktake',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing product_id', () => {
    const result = AdjustStockSchema.safeParse({
      quantity_delta: 5,
      reason: 'received',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid UUID for product_id', () => {
    const result = AdjustStockSchema.safeParse({
      product_id: 'not-a-uuid',
      quantity_delta: 5,
      reason: 'received',
    })
    expect(result.success).toBe(false)
  })

  it('rejects notes longer than 500 chars', () => {
    const result = AdjustStockSchema.safeParse({
      product_id: validUuid,
      quantity_delta: 5,
      reason: 'received',
      notes: 'a'.repeat(501),
    })
    expect(result.success).toBe(false)
  })

  it('accepts negative quantity_delta', () => {
    const result = AdjustStockSchema.safeParse({
      product_id: validUuid,
      quantity_delta: -3,
      reason: 'damaged',
    })
    expect(result.success).toBe(true)
  })

  it('rejects non-integer quantity_delta', () => {
    const result = AdjustStockSchema.safeParse({
      product_id: validUuid,
      quantity_delta: 1.5,
      reason: 'received',
    })
    expect(result.success).toBe(false)
  })
})

describe('CreateStocktakeSchema', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000'

  it('accepts scope full without category_id', () => {
    const result = CreateStocktakeSchema.safeParse({ scope: 'full' })
    expect(result.success).toBe(true)
  })

  it('accepts scope full with category_id (category_id ignored)', () => {
    const result = CreateStocktakeSchema.safeParse({
      scope: 'full',
      category_id: validUuid,
    })
    expect(result.success).toBe(true)
  })

  it('accepts scope category with category_id', () => {
    const result = CreateStocktakeSchema.safeParse({
      scope: 'category',
      category_id: validUuid,
    })
    expect(result.success).toBe(true)
  })

  it('rejects scope category without category_id', () => {
    const result = CreateStocktakeSchema.safeParse({ scope: 'category' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid scope value', () => {
    const result = CreateStocktakeSchema.safeParse({ scope: 'partial' })
    expect(result.success).toBe(false)
  })
})

describe('UpdateStocktakeLineSchema', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000'

  it('accepts zero counted_quantity (zero is valid)', () => {
    const result = UpdateStocktakeLineSchema.safeParse({
      line_id: validUuid,
      counted_quantity: 0,
    })
    expect(result.success).toBe(true)
  })

  it('rejects negative counted_quantity', () => {
    const result = UpdateStocktakeLineSchema.safeParse({
      line_id: validUuid,
      counted_quantity: -1,
    })
    expect(result.success).toBe(false)
  })

  it('accepts positive counted_quantity', () => {
    const result = UpdateStocktakeLineSchema.safeParse({
      line_id: validUuid,
      counted_quantity: 42,
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing line_id', () => {
    const result = UpdateStocktakeLineSchema.safeParse({
      counted_quantity: 5,
    })
    expect(result.success).toBe(false)
  })

  it('rejects non-integer counted_quantity', () => {
    const result = UpdateStocktakeLineSchema.safeParse({
      line_id: validUuid,
      counted_quantity: 2.5,
    })
    expect(result.success).toBe(false)
  })
})
