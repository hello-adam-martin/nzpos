import { describe, test, expect } from 'vitest'
import { CreateProductSchema, UpdateProductSchema } from '@/schemas/product'

// ---------------------------------------------------------------------------
// Wave 0 test stubs — RED until Plan 01 adds cost_price_cents to schemas
// ---------------------------------------------------------------------------

const validProduct = {
  name: 'Test Product',
  price_cents: 1000,
  product_type: 'physical' as const,
  stock_quantity: 10,
  reorder_threshold: 2,
}

describe('CreateProductSchema cost_price_cents', () => {
  test('accepts cost_price_cents as a positive integer', () => {
    const result = CreateProductSchema.safeParse({
      ...validProduct,
      cost_price_cents: 500,
    })
    expect(result.success).toBe(true)
  })

  test('accepts cost_price_cents as null (no cost recorded)', () => {
    const result = CreateProductSchema.safeParse({
      ...validProduct,
      cost_price_cents: null,
    })
    expect(result.success).toBe(true)
  })

  test('accepts cost_price_cents omitted (optional field)', () => {
    const result = CreateProductSchema.safeParse({ ...validProduct })
    expect(result.success).toBe(true)
  })

  test('rejects negative cost_price_cents', () => {
    const result = CreateProductSchema.safeParse({
      ...validProduct,
      cost_price_cents: -1,
    })
    expect(result.success).toBe(false)
  })

  test('rejects non-integer cost_price_cents', () => {
    const result = CreateProductSchema.safeParse({
      ...validProduct,
      cost_price_cents: 5.5,
    })
    expect(result.success).toBe(false)
  })
})

describe('UpdateProductSchema cost_price_cents', () => {
  test('accepts partial update with cost_price_cents only', () => {
    const result = UpdateProductSchema.safeParse({ cost_price_cents: 800 })
    expect(result.success).toBe(true)
  })

  test('accepts partial update with cost_price_cents set to null', () => {
    const result = UpdateProductSchema.safeParse({ cost_price_cents: null })
    expect(result.success).toBe(true)
  })
})
