import { describe, it, expect } from 'vitest'
import { formatNZD, parsePriceToCents } from './money'

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

describe('parsePriceToCents', () => {
  it('parses "8.99" as 899', () => {
    expect(parsePriceToCents('8.99')).toBe(899)
  })

  it('parses "$8.99" as 899', () => {
    expect(parsePriceToCents('$8.99')).toBe(899)
  })

  it('parses "$1,000.00" as 100000', () => {
    expect(parsePriceToCents('$1,000.00')).toBe(100000)
  })

  it('parses "0" as 0', () => {
    expect(parsePriceToCents('0')).toBe(0)
  })

  it('returns null for empty string', () => {
    expect(parsePriceToCents('')).toBeNull()
  })

  it('returns null for "abc"', () => {
    expect(parsePriceToCents('abc')).toBeNull()
  })

  it('returns null for negative "-5.00"', () => {
    expect(parsePriceToCents('-5.00')).toBeNull()
  })
})
