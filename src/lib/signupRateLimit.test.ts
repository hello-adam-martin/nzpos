import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { checkRateLimit, resetRateLimit } from './signupRateLimit'

describe('checkRateLimit', () => {
  beforeEach(() => {
    resetRateLimit('1.2.3.4')
    resetRateLimit('5.6.7.8')
  })

  it('first call from an IP is allowed with 4 remaining', () => {
    const result = checkRateLimit('1.2.3.4')
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4)
  })

  it('5th call from same IP is allowed with 0 remaining', () => {
    checkRateLimit('1.2.3.4')
    checkRateLimit('1.2.3.4')
    checkRateLimit('1.2.3.4')
    checkRateLimit('1.2.3.4')
    const result = checkRateLimit('1.2.3.4')
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(0)
  })

  it('6th call from same IP is blocked', () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit('1.2.3.4')
    }
    const result = checkRateLimit('1.2.3.4')
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('different IP is not affected by first IP limits', () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit('1.2.3.4')
    }
    // 6th call blocks 1.2.3.4
    const blocked = checkRateLimit('1.2.3.4')
    expect(blocked.allowed).toBe(false)

    // but 5.6.7.8 is unaffected
    const result = checkRateLimit('5.6.7.8')
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4)
  })

  it('after window expires, IP is allowed again', () => {
    const now = Date.now()
    vi.spyOn(Date, 'now').mockReturnValue(now)

    for (let i = 0; i < 5; i++) {
      checkRateLimit('1.2.3.4')
    }
    // Blocked
    expect(checkRateLimit('1.2.3.4').allowed).toBe(false)

    // Advance time past window (1 hour + 1ms)
    vi.spyOn(Date, 'now').mockReturnValue(now + 60 * 60 * 1000 + 1)

    const result = checkRateLimit('1.2.3.4')
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4)

    vi.restoreAllMocks()
  })
})
