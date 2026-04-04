import { describe, it, expect } from 'vitest'
import { CreateStocktakeSchema } from '@/schemas/inventory'

/**
 * Wave 0 scaffold for createStocktakeSession server action tests.
 * Non-todo tests validate Zod schema inputs (schema exists from Plan 01).
 * Server action behavior tests are stubs — filled in when createStocktakeSession.ts is implemented in Plan 02.
 */
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
    it.todo('calls requireFeature with inventory and requireDbCheck: true')
    it.todo('creates session row with status in_progress')
    it.todo('creates stocktake_lines for all physical products with current stock as snapshot')
    it.todo('filters products by category when scope is category')
    it.todo('returns session id on success')
  })
})
