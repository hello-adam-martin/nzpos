import { describe, it, expect } from 'vitest'
import { formatNZD } from './money'

describe('formatNZD', () => {
  it('formats 899 as "$8.99"', () => {
    expect(formatNZD(899)).toBe('$8.99')
  })

  it('formats 0 as "$0.00"', () => {
    expect(formatNZD(0)).toBe('$0.00')
  })

  it('formats 100000 as "$1,000.00"', () => {
    expect(formatNZD(100000)).toBe('$1,000.00')
  })

  it('formats 1 as "$0.01"', () => {
    expect(formatNZD(1)).toBe('$0.01')
  })

  it('formats -500 as "-$5.00" for refunds', () => {
    expect(formatNZD(-500)).toBe('-$5.00')
  })
})
