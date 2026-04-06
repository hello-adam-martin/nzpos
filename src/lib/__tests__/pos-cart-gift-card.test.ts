import { describe, it, expect } from 'vitest'
import { cartReducer, initialCartState } from '@/lib/cart'

// Helper: build a cart state with one item (1000 cents = $10)
function cartWithItem(priceCents: number) {
  return cartReducer(initialCartState, {
    type: 'ADD_PRODUCT',
    product: { id: 'p1', name: 'Test Product', price_cents: priceCents, stock_quantity: 10 },
  })
}

describe('cart state machine — gift card payment', () => {
  it('transitions to gift_card_entry phase when gift_card payment method selected', () => {
    // SET_PAYMENT_METHOD { method: 'gift_card' } -> INITIATE_PAYMENT -> phase: 'gift_card_entry'
    let state = cartWithItem(1000)
    state = cartReducer(state, { type: 'SET_PAYMENT_METHOD', method: 'gift_card' })
    expect(state.paymentMethod).toBe('gift_card')
    state = cartReducer(state, { type: 'INITIATE_PAYMENT' })
    expect(state.phase).toBe('gift_card_entry')
  })

  it('stores gift card code on ENTER_GIFT_CARD_CODE action', () => {
    // Strips non-digits, stores raw 8-digit code
    let state = cartWithItem(1000)
    state = cartReducer(state, { type: 'SET_PAYMENT_METHOD', method: 'gift_card' })
    state = cartReducer(state, { type: 'INITIATE_PAYMENT' })
    state = cartReducer(state, { type: 'ENTER_GIFT_CARD_CODE', code: '1234-5678' })
    expect(state.giftCardCode).toBe('12345678')
    // Also strips letters
    state = cartReducer(state, { type: 'ENTER_GIFT_CARD_CODE', code: '12AB3456CD78' })
    expect(state.giftCardCode).toBe('12345678')
  })

  it('computes auto-split on GIFT_CARD_VALIDATED when balance covers full total', () => {
    // giftCardAmountCents = totalCents, phase -> 'gift_card_confirmed'
    let state = cartWithItem(5000) // $50 total
    state = cartReducer(state, { type: 'SET_PAYMENT_METHOD', method: 'gift_card' })
    state = cartReducer(state, { type: 'INITIATE_PAYMENT' })
    state = cartReducer(state, {
      type: 'GIFT_CARD_VALIDATED',
      balanceCents: 8000, // $80 balance — covers $50 total
      expiresAt: '2029-04-06T00:00:00Z',
    })
    expect(state.giftCardAmountCents).toBe(5000) // min(8000, 5000) = 5000
    expect(state.giftCardRemainingAfterCents).toBe(3000) // 8000 - 5000
    expect(state.giftCardBalanceCents).toBe(8000)
    expect(state.giftCardExpiresAt).toBe('2029-04-06T00:00:00Z')
    expect(state.phase).toBe('gift_card_confirmed')
  })

  it('remains in gift_card_entry on GIFT_CARD_VALIDATED when balance < total (needs split method)', () => {
    // giftCardAmountCents = balanceCents (< total), splitRemainderMethod needed
    let state = cartWithItem(5000) // $50 total
    state = cartReducer(state, { type: 'SET_PAYMENT_METHOD', method: 'gift_card' })
    state = cartReducer(state, { type: 'INITIATE_PAYMENT' })
    state = cartReducer(state, {
      type: 'GIFT_CARD_VALIDATED',
      balanceCents: 3000, // $30 balance — only partially covers $50 total
      expiresAt: '2029-04-06T00:00:00Z',
    })
    expect(state.giftCardAmountCents).toBe(3000) // min(3000, 5000) = 3000
    expect(state.giftCardRemainingAfterCents).toBe(0) // card fully depleted
    expect(state.phase).toBe('gift_card_entry') // still needs split method selection
  })

  it('transitions to gift_card_confirmed after SET_SPLIT_REMAINDER_METHOD', () => {
    let state = cartWithItem(5000)
    state = cartReducer(state, { type: 'SET_PAYMENT_METHOD', method: 'gift_card' })
    state = cartReducer(state, { type: 'INITIATE_PAYMENT' })
    state = cartReducer(state, {
      type: 'GIFT_CARD_VALIDATED',
      balanceCents: 3000,
      expiresAt: '2029-04-06T00:00:00Z',
    })
    expect(state.phase).toBe('gift_card_entry')
    state = cartReducer(state, { type: 'SET_SPLIT_REMAINDER_METHOD', method: 'eftpos' })
    expect(state.phase).toBe('gift_card_confirmed')
    expect(state.splitRemainderMethod).toBe('eftpos')
  })

  it('resets gift card fields on GIFT_CARD_VALIDATION_FAILED', () => {
    let state = cartWithItem(5000)
    state = cartReducer(state, { type: 'SET_PAYMENT_METHOD', method: 'gift_card' })
    state = cartReducer(state, { type: 'INITIATE_PAYMENT' })
    state = cartReducer(state, { type: 'ENTER_GIFT_CARD_CODE', code: '12345678' })
    expect(state.giftCardCode).toBe('12345678')
    state = cartReducer(state, { type: 'GIFT_CARD_VALIDATION_FAILED' })
    expect(state.giftCardCode).toBeNull()
    expect(state.giftCardBalanceCents).toBeNull()
    expect(state.giftCardAmountCents).toBeNull()
    expect(state.giftCardRemainingAfterCents).toBeNull()
    expect(state.giftCardExpiresAt).toBeNull()
    expect(state.phase).toBe('gift_card_entry') // stays in entry phase for retry
  })

  it('resets all gift card fields on NEW_SALE', () => {
    let state = cartWithItem(5000)
    state = cartReducer(state, { type: 'SET_PAYMENT_METHOD', method: 'gift_card' })
    state = cartReducer(state, { type: 'INITIATE_PAYMENT' })
    state = cartReducer(state, {
      type: 'GIFT_CARD_VALIDATED',
      balanceCents: 8000,
      expiresAt: '2029-04-06T00:00:00Z',
    })
    state = cartReducer(state, { type: 'SALE_COMPLETE', orderId: 'order-1' })
    state = cartReducer(state, { type: 'NEW_SALE' })
    expect(state.giftCardCode).toBeNull()
    expect(state.giftCardBalanceCents).toBeNull()
    expect(state.giftCardAmountCents).toBeNull()
    expect(state.giftCardRemainingAfterCents).toBeNull()
    expect(state.giftCardExpiresAt).toBeNull()
    expect(state.splitRemainderMethod).toBeNull()
    expect(state.paymentMethod).toBeNull()
    expect(state.phase).toBe('idle')
  })
})
