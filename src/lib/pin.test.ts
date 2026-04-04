import { describe, it, expect } from 'vitest'
import { generatePin, isPinBlacklisted } from './pin'

const BLACKLISTED_PINS = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234', '4321']

describe('isPinBlacklisted', () => {
  it('returns true for all blacklisted PINs', () => {
    for (const pin of BLACKLISTED_PINS) {
      expect(isPinBlacklisted(pin)).toBe(true)
    }
  })

  it('returns false for a non-blacklisted PIN', () => {
    expect(isPinBlacklisted('2587')).toBe(false)
  })

  it('returns false for other non-blacklisted PINs', () => {
    expect(isPinBlacklisted('5678')).toBe(false)
    expect(isPinBlacklisted('9876')).toBe(false)
    expect(isPinBlacklisted('0001')).toBe(false)
  })
})

describe('generatePin', () => {
  it('returns a string of exactly 4 characters', () => {
    const pin = generatePin()
    expect(pin).toHaveLength(4)
    expect(typeof pin).toBe('string')
  })

  it('returns only numeric digits', () => {
    const pin = generatePin()
    expect(pin).toMatch(/^\d{4}$/)
  })

  it('pads with leading zeros when necessary', () => {
    // Run many iterations — statistically we should get a low-digit PIN
    // At minimum verify the format contract
    for (let i = 0; i < 100; i++) {
      const pin = generatePin()
      expect(pin).toMatch(/^\d{4}$/)
      expect(pin).toHaveLength(4)
    }
  })

  it('never returns a blacklisted PIN', () => {
    // Run 1000 iterations to get statistical confidence
    for (let i = 0; i < 1000; i++) {
      const pin = generatePin()
      expect(BLACKLISTED_PINS).not.toContain(pin)
    }
  })

  it('returns different values on repeated calls (non-deterministic)', () => {
    const pins = new Set<string>()
    for (let i = 0; i < 20; i++) {
      pins.add(generatePin())
    }
    // 20 calls should produce at least 2 unique values
    expect(pins.size).toBeGreaterThan(1)
  })
})
