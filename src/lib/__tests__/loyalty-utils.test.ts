import { describe, it, expect } from 'vitest'
import {
  calculatePointsEarned,
  calculateRedemptionDiscount,
  formatLoyaltyDisplay,
} from '../loyalty-utils'

describe('loyalty-utils', () => {
  describe('calculatePointsEarned', () => {
    it('earns 1 point per 100 cents at earn_rate_cents=100', () => {
      // $5.00 (500 cents) / 100 = 5 pts
      expect(calculatePointsEarned(500, 100)).toBe(5)
    })
    it('floors fractional points (150 cents at rate 100 = 1 pt)', () => {
      expect(calculatePointsEarned(150, 100)).toBe(1)
    })
    it('returns 0 when netAmountCents <= 0', () => {
      expect(calculatePointsEarned(0, 100)).toBe(0)
      expect(calculatePointsEarned(-500, 100)).toBe(0)
    })
    it('returns 0 when earnRateCents <= 0', () => {
      expect(calculatePointsEarned(500, 0)).toBe(0)
      expect(calculatePointsEarned(500, -100)).toBe(0)
    })
  })

  describe('calculateRedemptionDiscount', () => {
    it('calculates discount from points at redeemRateCents=1 (100pts = $1)', () => {
      // 100 pts * 1 cent/pt = 100 cents = $1.00
      expect(calculateRedemptionDiscount(100, 1)).toBe(100)
    })
    it('returns 0 when pointsToRedeem <= 0', () => {
      expect(calculateRedemptionDiscount(0, 1)).toBe(0)
      expect(calculateRedemptionDiscount(-100, 1)).toBe(0)
    })
    it('returns 0 when redeemRateCents <= 0', () => {
      expect(calculateRedemptionDiscount(100, 0)).toBe(0)
      expect(calculateRedemptionDiscount(100, -1)).toBe(0)
    })
  })

  describe('formatLoyaltyDisplay', () => {
    it('formats as "450 pts ($4.50 available)" per D-05', () => {
      // 450 pts * 1 cent/pt = 450 cents = $4.50
      expect(formatLoyaltyDisplay(450, 1)).toBe('450 pts ($4.50 available)')
    })
  })
})
