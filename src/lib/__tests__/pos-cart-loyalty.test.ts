import { describe, it, expect } from 'vitest'
import { cartReducer, initialCartState } from '@/lib/cart'

describe('cart state machine — loyalty customer attachment', () => {
  it('attaches customer with ATTACH_CUSTOMER action', () => {
    const state = cartReducer(initialCartState, {
      type: 'ATTACH_CUSTOMER',
      customerId: 'cust-123',
      name: 'Jane Smith',
      pointsBalance: 450,
    })
    expect(state.attachedCustomerId).toBe('cust-123')
  })

  it('stores customer name and points balance on ATTACH_CUSTOMER', () => {
    const state = cartReducer(initialCartState, {
      type: 'ATTACH_CUSTOMER',
      customerId: 'cust-456',
      name: 'John Doe',
      pointsBalance: 200,
    })
    expect(state.attachedCustomerName).toBe('John Doe')
    expect(state.attachedCustomerPoints).toBe(200)
  })

  it('clears customer on DETACH_CUSTOMER', () => {
    const withCustomer = cartReducer(initialCartState, {
      type: 'ATTACH_CUSTOMER',
      customerId: 'cust-789',
      name: 'Test User',
      pointsBalance: 100,
    })
    const detached = cartReducer(withCustomer, { type: 'DETACH_CUSTOMER' })
    expect(detached.attachedCustomerId).toBeNull()
    expect(detached.attachedCustomerName).toBeNull()
    expect(detached.attachedCustomerPoints).toBeNull()
  })

  it('preserves cart items when attaching customer', () => {
    const withProduct = cartReducer(initialCartState, {
      type: 'ADD_PRODUCT',
      product: { id: 'prod-1', name: 'Widget', price_cents: 1000, stock_quantity: 10 },
    })
    const withCustomer = cartReducer(withProduct, {
      type: 'ATTACH_CUSTOMER',
      customerId: 'cust-101',
      name: 'Alice',
      pointsBalance: 50,
    })
    expect(withCustomer.items).toHaveLength(1)
    expect(withCustomer.items[0].productId).toBe('prod-1')
    expect(withCustomer.attachedCustomerId).toBe('cust-101')
  })
})

describe('cart state machine — loyalty discount', () => {
  it('applies loyalty discount with APPLY_LOYALTY_DISCOUNT', () => {
    const state = cartReducer(initialCartState, {
      type: 'APPLY_LOYALTY_DISCOUNT',
      discountCents: 450,
      pointsRedeemed: 450,
    })
    expect(state.loyaltyDiscountCents).toBe(450)
  })

  it('stores loyaltyDiscountCents and loyaltyPointsRedeemed', () => {
    const state = cartReducer(initialCartState, {
      type: 'APPLY_LOYALTY_DISCOUNT',
      discountCents: 300,
      pointsRedeemed: 300,
    })
    expect(state.loyaltyDiscountCents).toBe(300)
    expect(state.loyaltyPointsRedeemed).toBe(300)
  })

  it('removes loyalty discount with REMOVE_LOYALTY_DISCOUNT', () => {
    const withDiscount = cartReducer(initialCartState, {
      type: 'APPLY_LOYALTY_DISCOUNT',
      discountCents: 200,
      pointsRedeemed: 200,
    })
    const removed = cartReducer(withDiscount, { type: 'REMOVE_LOYALTY_DISCOUNT' })
    expect(removed.loyaltyDiscountCents).toBeNull()
    expect(removed.loyaltyPointsRedeemed).toBeNull()
  })

  it('clears loyalty discount on DETACH_CUSTOMER', () => {
    let state = cartReducer(initialCartState, {
      type: 'ATTACH_CUSTOMER',
      customerId: 'cust-1',
      name: 'Test',
      pointsBalance: 500,
    })
    state = cartReducer(state, {
      type: 'APPLY_LOYALTY_DISCOUNT',
      discountCents: 500,
      pointsRedeemed: 500,
    })
    state = cartReducer(state, { type: 'DETACH_CUSTOMER' })
    expect(state.loyaltyDiscountCents).toBeNull()
    expect(state.loyaltyPointsRedeemed).toBeNull()
    expect(state.attachedCustomerId).toBeNull()
  })

  it('clears loyalty discount on NEW_SALE', () => {
    let state = cartReducer(initialCartState, {
      type: 'ATTACH_CUSTOMER',
      customerId: 'cust-2',
      name: 'Test',
      pointsBalance: 100,
    })
    state = cartReducer(state, {
      type: 'APPLY_LOYALTY_DISCOUNT',
      discountCents: 100,
      pointsRedeemed: 100,
    })
    state = cartReducer(state, { type: 'NEW_SALE' })
    expect(state.loyaltyDiscountCents).toBeNull()
    expect(state.loyaltyPointsRedeemed).toBeNull()
    expect(state.attachedCustomerId).toBeNull()
  })
})
