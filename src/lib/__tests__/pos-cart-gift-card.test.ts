import { describe, it, expect } from 'vitest'

describe('cart state machine — gift card payment', () => {
  it('transitions to gift_card_entry phase when gift_card payment method selected', () => {
    // SET_PAYMENT_METHOD { method: 'gift_card' } -> INITIATE_PAYMENT -> phase: 'gift_card_entry'
    expect(true).toBe(false) // RED — Plan 03 adds gift_card to cart
  })

  it('stores gift card code on ENTER_GIFT_CARD_CODE action', () => {
    // Strips non-digits, stores raw 8-digit code
    expect(true).toBe(false) // RED
  })

  it('computes auto-split on GIFT_CARD_VALIDATED when balance covers full total', () => {
    // giftCardAmountCents = totalCents, phase -> 'gift_card_confirmed'
    expect(true).toBe(false) // RED
  })

  it('remains in gift_card_entry on GIFT_CARD_VALIDATED when balance < total (needs split method)', () => {
    // giftCardAmountCents = balanceCents (< total), splitRemainderMethod needed
    expect(true).toBe(false) // RED
  })

  it('transitions to gift_card_confirmed after SET_SPLIT_REMAINDER_METHOD', () => {
    expect(true).toBe(false) // RED
  })

  it('resets gift card fields on GIFT_CARD_VALIDATION_FAILED', () => {
    expect(true).toBe(false) // RED
  })

  it('resets all gift card fields on NEW_SALE', () => {
    expect(true).toBe(false) // RED
  })
})
