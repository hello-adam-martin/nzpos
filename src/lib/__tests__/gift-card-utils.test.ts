import { describe, it, expect } from 'vitest'
import {
  generateGiftCardCode,
  formatGiftCardCode,
  normalizeGiftCardCode,
  effectiveGiftCardStatus,
  computeGiftCardSplit,
} from '../gift-card-utils'

describe('gift card code generation', () => {
  it('generates an 8-digit numeric string', () => {
    const code = generateGiftCardCode()
    expect(code).toMatch(/^\d{8}$/)
  })

  it('pads codes shorter than 8 digits with leading zeros', () => {
    // generateGiftCardCode always returns padStart(8, '0')
    // Verify the padded output is always exactly 8 chars
    for (let i = 0; i < 20; i++) {
      const code = generateGiftCardCode()
      expect(code.length).toBe(8)
      expect(/^\d+$/.test(code)).toBe(true)
    }
  })

  it('formats code as XXXX-XXXX with dash', () => {
    expect(formatGiftCardCode('48271593')).toBe('4827-1593')
    expect(formatGiftCardCode('00000001')).toBe('0000-0001')
  })
})

describe('gift card expiry validation', () => {
  it('treats active card past expires_at as expired', () => {
    const pastDate = new Date(Date.now() - 1000).toISOString()
    expect(effectiveGiftCardStatus('active', pastDate)).toBe('expired')
  })

  it('accepts active card within expiry window', () => {
    const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    expect(effectiveGiftCardStatus('active', futureDate)).toBe('active')
  })

  it('rejects voided card regardless of expiry', () => {
    const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    expect(effectiveGiftCardStatus('voided', futureDate)).toBe('voided')
  })
})

describe('gift card balance operations', () => {
  it('computes auto-split: full cover when balance >= total', () => {
    const { giftCardAmount, remainder } = computeGiftCardSplit(5000, 3000)
    expect(giftCardAmount).toBe(3000)
    expect(remainder).toBe(0)
  })

  it('computes auto-split: partial cover when balance < total', () => {
    const { giftCardAmount, remainder } = computeGiftCardSplit(3000, 5000)
    expect(giftCardAmount).toBe(3000)
    expect(remainder).toBe(2000)
  })

  it('strips non-numeric characters from code input', () => {
    expect(normalizeGiftCardCode('4827-1593')).toBe('48271593')
    expect(normalizeGiftCardCode('4827 1593')).toBe('48271593')
    expect(normalizeGiftCardCode('48271593')).toBe('48271593')
  })
})
