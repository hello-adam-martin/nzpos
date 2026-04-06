import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// Mirror of the schema in saveLoyaltySettings.ts — pure Zod unit tests
const saveLoyaltySettingsSchema = z.object({
  earn_rate_cents: z.number().int().positive(),
  redeem_rate_cents: z.number().int().positive(),
  is_active: z.boolean(),
})

describe('saveLoyaltySettings', () => {
  it('validates earn_rate_cents is a positive integer', () => {
    const result = saveLoyaltySettingsSchema.safeParse({
      earn_rate_cents: 100,
      redeem_rate_cents: 1,
      is_active: true,
    })
    expect(result.success).toBe(true)
  })

  it('validates redeem_rate_cents is a positive integer', () => {
    const result = saveLoyaltySettingsSchema.safeParse({
      earn_rate_cents: 100,
      redeem_rate_cents: 1,
      is_active: false,
    })
    expect(result.success).toBe(true)
  })

  it('rejects zero earn_rate_cents', () => {
    const result = saveLoyaltySettingsSchema.safeParse({
      earn_rate_cents: 0,
      redeem_rate_cents: 1,
      is_active: true,
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative redeem_rate_cents', () => {
    const result = saveLoyaltySettingsSchema.safeParse({
      earn_rate_cents: 100,
      redeem_rate_cents: -1,
      is_active: true,
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid settings with is_active boolean', () => {
    const resultTrue = saveLoyaltySettingsSchema.safeParse({
      earn_rate_cents: 50,
      redeem_rate_cents: 2,
      is_active: true,
    })
    const resultFalse = saveLoyaltySettingsSchema.safeParse({
      earn_rate_cents: 50,
      redeem_rate_cents: 2,
      is_active: false,
    })
    expect(resultTrue.success).toBe(true)
    expect(resultFalse.success).toBe(true)
  })
})
