import { describe, it, expect } from 'vitest'
import { CreateStocktakeSchema } from '@/schemas/inventory'

/**
 * Wave 0 scaffold for commitStocktake server action tests.
 * Non-todo tests validate related schema inputs (schema exists from Plan 01).
 * Server action behavior tests are stubs — filled in when commitStocktake.ts is implemented in Plan 03.
 */
describe('commitStocktake', () => {
  it('CreateStocktakeSchema rejects invalid scope values (schema used by commitStocktake flow)', () => {
    const result = CreateStocktakeSchema.safeParse({ scope: 'invalid' })
    expect(result.success).toBe(false)
  })

  it.todo('calls requireFeature with inventory and requireDbCheck: true')
  it.todo('calls complete_stocktake RPC with session_id and store_id')
  it.todo('returns lines_committed count on success')
  it.todo('returns error when session is not in_progress')
  it.todo('returns error when feature not active')
})
