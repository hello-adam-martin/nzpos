/**
 * IRD specimen GST validation tests (TEST-05, per D-05)
 *
 * Validates the 3/23 GST extraction formula against IRD-published examples.
 * Source: IRD GST filing guide — calculating GST from tax-inclusive amounts.
 * Formula: GST = price × 3/23 (derived from 15% inclusive: price × 15/115 = price × 3/23)
 *
 * All monetary values are in cents (integer arithmetic, no floating point).
 */
import { describe, it, expect } from 'vitest'
import { gstFromInclusiveCents, calcLineItem } from './gst'

describe('IRD specimen GST validation (gstFromInclusiveCents)', () => {
  it('IRD specimen: $115.00 inclusive → $15.00 GST (1500 cents)', () => {
    // $115.00 × 3/23 = $15.00 exactly
    expect(gstFromInclusiveCents(11500)).toBe(1500)
  })

  it('IRD specimen: $230.00 inclusive → $30.00 GST (3000 cents)', () => {
    // $230.00 × 3/23 = $30.00 exactly
    expect(gstFromInclusiveCents(23000)).toBe(3000)
  })

  it('IRD specimen: $1,150.00 inclusive → $150.00 GST (15000 cents)', () => {
    // $1150.00 × 3/23 = $150.00 exactly
    expect(gstFromInclusiveCents(115000)).toBe(15000)
  })

  it('IRD rounding: $1.00 inclusive → $0.13 GST (13 cents)', () => {
    // $1.00 × 3/23 = $0.130434... → rounds to $0.13
    expect(gstFromInclusiveCents(100)).toBe(13)
  })

  it('IRD specimen: $46.00 inclusive → $6.00 GST (600 cents)', () => {
    // $46.00 × 3/23 = $6.00 exactly
    expect(gstFromInclusiveCents(4600)).toBe(600)
  })

  it('IRD specimen: $23.00 inclusive → $3.00 GST (300 cents)', () => {
    // $23.00 × 3/23 = $3.00 exactly
    expect(gstFromInclusiveCents(2300)).toBe(300)
  })
})

describe('IRD specimen calcLineItem validation', () => {
  it('IRD specimen: $115.00 × 1 qty, no discount → lineTotal 11500, gst 1500, excl 10000', () => {
    const result = calcLineItem(11500, 1, 0)
    expect(result.lineTotal).toBe(11500)
    expect(result.gst).toBe(1500)
    expect(result.excl).toBe(10000)
  })

  it('IRD specimen: $115.00 × 2 qty, $10.00 discount → lineTotal 22000, gst from 22000', () => {
    // $115 × 2 = $230, minus $10 discount = $220 = 22000 cents
    // $220 × 3/23 = $28.695... → rounds to 2870 cents
    const result = calcLineItem(11500, 2, 1000)
    expect(result.lineTotal).toBe(22000)
    expect(result.gst).toBe(Math.round(22000 * 3 / 23))
    expect(result.excl).toBe(result.lineTotal - result.gst)
  })

  it('GST + excl always sums to lineTotal (accounting identity)', () => {
    const testCases = [
      { unit: 999, qty: 1, disc: 0 },
      { unit: 11500, qty: 1, disc: 0 },
      { unit: 3499, qty: 3, disc: 500 },
      { unit: 23000, qty: 2, disc: 0 },
    ]
    for (const { unit, qty, disc } of testCases) {
      const result = calcLineItem(unit, qty, disc)
      expect(result.gst + result.excl).toBe(result.lineTotal)
    }
  })
})
