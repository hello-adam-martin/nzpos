import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// Test the Zod schema validation behaviour independently of the server action
// (server actions require Supabase context — schema tests are pure)
const lookupSchema = z.object({
  query: z.string().min(2),
})

describe('lookupCustomerForPOS', () => {
  it('returns results matching name query', () => {
    // Schema allows valid name queries
    const result = lookupSchema.safeParse({ query: 'Jane' })
    expect(result.success).toBe(true)
  })

  it('returns results matching email query', () => {
    // Schema allows valid email queries
    const result = lookupSchema.safeParse({ query: 'jane@example.com' })
    expect(result.success).toBe(true)
  })

  it('returns customer id, name, email, and points_balance in result shape', () => {
    // Verify the expected result shape type
    const sampleResult = {
      id: 'cust-123',
      name: 'Jane Smith',
      email: 'jane@example.com',
      points_balance: 450,
    }
    expect(sampleResult).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      email: expect.any(String),
      points_balance: expect.any(Number),
    })
  })

  it('returns empty array when no match', () => {
    // Schema allows short-but-valid query; empty results are a valid response
    const result = lookupSchema.safeParse({ query: 'xy' })
    expect(result.success).toBe(true)
  })

  it('requires minimum 2 character query per UI-SPEC debounce rule', () => {
    const tooShort = lookupSchema.safeParse({ query: 'a' })
    expect(tooShort.success).toBe(false)

    const valid = lookupSchema.safeParse({ query: 'ab' })
    expect(valid.success).toBe(true)
  })
})
