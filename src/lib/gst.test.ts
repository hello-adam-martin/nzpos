import { describe, it, expect } from 'vitest'
import { gstFromInclusiveCents, calcLineItem, calcOrderGST } from './gst'

describe('gstFromInclusiveCents', () => {
  it('returns 300 for NZ$23.00 item', () => {
    expect(gstFromInclusiveCents(2300)).toBe(300)
  })

  it('returns 150 for $11.50 item', () => {
    expect(gstFromInclusiveCents(1150)).toBe(150)
  })

  it('returns 13 for $1.00 item (rounding)', () => {
    expect(gstFromInclusiveCents(100)).toBe(13)
  })

  it('returns 0 for zero-value item', () => {
    expect(gstFromInclusiveCents(0)).toBe(0)
  })

  it('returns 0 for $0.01 item (rounds to 0)', () => {
    expect(gstFromInclusiveCents(1)).toBe(0)
  })

  it('returns 117 for $8.99 item', () => {
    expect(gstFromInclusiveCents(899)).toBe(117)
  })
})

describe('calcLineItem', () => {
  it('returns correct line totals for no discount', () => {
    expect(calcLineItem(899, 1, 0)).toEqual({ lineTotal: 899, gst: 117, excl: 782 })
  })

  it('returns correct line totals for 3 units', () => {
    expect(calcLineItem(899, 3, 0)).toEqual({ lineTotal: 2697, gst: 352, excl: 2345 })
  })

  it('returns correct line totals with $1.00 discount', () => {
    expect(calcLineItem(899, 1, 100)).toEqual({ lineTotal: 799, gst: 104, excl: 695 })
  })

  it('returns correct line totals for 2x$34.99 with $5 discount', () => {
    expect(calcLineItem(3499, 2, 500)).toEqual({ lineTotal: 6498, gst: 848, excl: 5650 })
  })

  it('defaults discount to 0 when not provided', () => {
    expect(calcLineItem(899, 1)).toEqual({ lineTotal: 899, gst: 117, excl: 782 })
  })
})

describe('calcOrderGST', () => {
  it('sums line GSTs correctly', () => {
    expect(calcOrderGST([117, 352, 104])).toBe(573)
  })

  it('returns 0 for empty order', () => {
    expect(calcOrderGST([])).toBe(0)
  })

  it('returns correct sum for single line item', () => {
    expect(calcOrderGST([300])).toBe(300)
  })
})
