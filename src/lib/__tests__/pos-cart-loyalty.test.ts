import { describe, it, expect } from 'vitest'

describe('cart state machine — loyalty customer attachment', () => {
  it('attaches customer with ATTACH_CUSTOMER action', () => {
    expect(true).toBe(false) // RED: CartState does not have attachedCustomerId yet
  })
  it('stores customer name and points balance on ATTACH_CUSTOMER', () => {
    expect(true).toBe(false)
  })
  it('clears customer on DETACH_CUSTOMER', () => {
    expect(true).toBe(false)
  })
  it('preserves cart items when attaching customer', () => {
    expect(true).toBe(false)
  })
})

describe('cart state machine — loyalty discount', () => {
  it('applies loyalty discount with APPLY_LOYALTY_DISCOUNT', () => {
    expect(true).toBe(false) // RED: APPLY_LOYALTY_DISCOUNT action not implemented
  })
  it('stores loyaltyDiscountCents and loyaltyPointsRedeemed', () => {
    expect(true).toBe(false)
  })
  it('removes loyalty discount with REMOVE_LOYALTY_DISCOUNT', () => {
    expect(true).toBe(false)
  })
  it('clears loyalty discount on DETACH_CUSTOMER', () => {
    expect(true).toBe(false)
  })
  it('clears loyalty discount on NEW_SALE', () => {
    expect(true).toBe(false)
  })
})
