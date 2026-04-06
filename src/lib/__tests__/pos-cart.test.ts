import { describe, it, expect } from 'vitest'
import {
  cartReducer,
  calcCartTotals,
  applyCartDiscount,
  calcChangeDue,
  initialCartState,
  type CartItem,
  type CartState,
  type CartAction,
} from '../cart'

// Helper: build a minimal product row for ADD_PRODUCT
function makeProduct(overrides: Partial<{ id: string; name: string; price_cents: number; stock_quantity: number }> = {}) {
  return {
    id: 'p1',
    name: 'Widget',
    price_cents: 1000,
    stock_quantity: 5,
    ...overrides,
  }
}

describe('cartReducer', () => {
  describe('ADD_PRODUCT', () => {
    it('adds a new product to cart with correct calculations', () => {
      const state = cartReducer(initialCartState, {
        type: 'ADD_PRODUCT',
        product: makeProduct(),
      })
      expect(state.items).toHaveLength(1)
      const item = state.items[0]
      expect(item.productId).toBe('p1')
      expect(item.productName).toBe('Widget')
      expect(item.unitPriceCents).toBe(1000)
      expect(item.quantity).toBe(1)
      expect(item.discountCents).toBe(0)
      expect(item.lineTotalCents).toBe(1000)
      // Math.round(1000 * 3 / 23) = Math.round(130.43) = 130
      expect(item.gstCents).toBe(130)
    })

    it('increments quantity when adding product already in cart', () => {
      const state1 = cartReducer(initialCartState, {
        type: 'ADD_PRODUCT',
        product: makeProduct(),
      })
      const state2 = cartReducer(state1, {
        type: 'ADD_PRODUCT',
        product: makeProduct(),
      })
      expect(state2.items).toHaveLength(1)
      expect(state2.items[0].quantity).toBe(2)
      expect(state2.items[0].lineTotalCents).toBe(2000)
      // Math.round(2000 * 3 / 23) = Math.round(260.87) = 261
      expect(state2.items[0].gstCents).toBe(261)
    })
  })

  describe('SET_QUANTITY', () => {
    it('updates quantity and recalculates totals', () => {
      const state1 = cartReducer(initialCartState, {
        type: 'ADD_PRODUCT',
        product: makeProduct(),
      })
      const state2 = cartReducer(state1, {
        type: 'SET_QUANTITY',
        productId: 'p1',
        quantity: 3,
      })
      expect(state2.items[0].quantity).toBe(3)
      expect(state2.items[0].lineTotalCents).toBe(3000)
      // Math.round(3000 * 3 / 23) = Math.round(391.30) = 391
      expect(state2.items[0].gstCents).toBe(391)
    })

    it('removes item when quantity set to 0', () => {
      const state1 = cartReducer(initialCartState, {
        type: 'ADD_PRODUCT',
        product: makeProduct(),
      })
      const state2 = cartReducer(state1, {
        type: 'SET_QUANTITY',
        productId: 'p1',
        quantity: 0,
      })
      expect(state2.items).toHaveLength(0)
    })
  })

  describe('REMOVE_ITEM', () => {
    it('removes specific product and leaves others', () => {
      const state1 = cartReducer(initialCartState, {
        type: 'ADD_PRODUCT',
        product: makeProduct({ id: 'p1', name: 'Widget' }),
      })
      const state2 = cartReducer(state1, {
        type: 'ADD_PRODUCT',
        product: makeProduct({ id: 'p2', name: 'Gadget', price_cents: 2000 }),
      })
      const state3 = cartReducer(state2, {
        type: 'REMOVE_ITEM',
        productId: 'p1',
      })
      expect(state3.items).toHaveLength(1)
      expect(state3.items[0].productId).toBe('p2')
    })
  })

  describe('APPLY_LINE_DISCOUNT', () => {
    it('applies line discount and recalculates GST', () => {
      const state1 = cartReducer(initialCartState, {
        type: 'ADD_PRODUCT',
        product: makeProduct({ price_cents: 1000 }),
      })
      // Set qty to 2 first
      const state2 = cartReducer(state1, {
        type: 'SET_QUANTITY',
        productId: 'p1',
        quantity: 2,
      })
      // Apply 200 cent discount: lineTotal = 2000 - 200 = 1800
      const state3 = cartReducer(state2, {
        type: 'APPLY_LINE_DISCOUNT',
        productId: 'p1',
        discountCents: 200,
      })
      expect(state3.items[0].discountCents).toBe(200)
      expect(state3.items[0].lineTotalCents).toBe(1800)
      // Math.round(1800 * 3 / 23) = Math.round(234.78) = 235
      expect(state3.items[0].gstCents).toBe(235)
    })
  })

  describe('APPLY_CART_DISCOUNT', () => {
    it('distributes fixed discount pro-rata across 2 items', () => {
      // item1: 500c, item2: 1500c — total 2000c
      const state1 = cartReducer(initialCartState, {
        type: 'ADD_PRODUCT',
        product: makeProduct({ id: 'p1', name: 'Item1', price_cents: 500 }),
      })
      const state2 = cartReducer(state1, {
        type: 'ADD_PRODUCT',
        product: makeProduct({ id: 'p2', name: 'Item2', price_cents: 1500 }),
      })
      // Apply 1000c fixed discount
      const state3 = cartReducer(state2, {
        type: 'APPLY_CART_DISCOUNT',
        discountCents: 1000,
        discountType: 'fixed',
      })
      // item1 pro-rata: Math.floor(1000 * 500 / 2000) = 250
      // item2 absorbs remainder: 1000 - 250 = 750
      expect(state3.items[0].discountCents).toBe(250)
      expect(state3.items[1].discountCents).toBe(750)
      expect(state3.cartDiscountCents).toBe(1000)
    })

    it('distributes percentage discount pro-rata', () => {
      // 2 items: 2000c each, total 4000c
      const state1 = cartReducer(initialCartState, {
        type: 'ADD_PRODUCT',
        product: makeProduct({ id: 'p1', name: 'Item1', price_cents: 2000 }),
      })
      const state2 = cartReducer(state1, {
        type: 'ADD_PRODUCT',
        product: makeProduct({ id: 'p2', name: 'Item2', price_cents: 2000 }),
      })
      // 10% of 4000c = 400c, distributed equally (200c each)
      const state3 = cartReducer(state2, {
        type: 'APPLY_CART_DISCOUNT',
        discountCents: 400, // pre-calculated 10% value
        discountType: 'percentage',
      })
      expect(state3.items[0].discountCents).toBe(200)
      expect(state3.items[1].discountCents).toBe(200)
    })

    it('percentage 10% on cart total 5000c = 500c discount distributed pro-rata', () => {
      const state1 = cartReducer(initialCartState, {
        type: 'ADD_PRODUCT',
        product: makeProduct({ id: 'p1', name: 'Item1', price_cents: 5000 }),
      })
      // Only 1 item — full 500c discount goes to it
      const state2 = cartReducer(state1, {
        type: 'APPLY_CART_DISCOUNT',
        discountCents: 500, // 10% of 5000
        discountType: 'percentage',
      })
      expect(state2.items[0].discountCents).toBe(500)
      expect(state2.items[0].lineTotalCents).toBe(4500)
    })
  })

  describe('Payment flow', () => {
    it('SET_PAYMENT_METHOD updates paymentMethod', () => {
      const state = cartReducer(initialCartState, {
        type: 'SET_PAYMENT_METHOD',
        method: 'eftpos',
      })
      expect(state.paymentMethod).toBe('eftpos')
    })

    it('SET_CASH_TENDERED calculates change due', () => {
      // Cart total would be 4250 — but SET_CASH_TENDERED just stores the amount
      const state = cartReducer({ ...initialCartState, paymentMethod: 'cash' }, {
        type: 'SET_CASH_TENDERED',
        cents: 5000,
      })
      expect(state.cashTenderedCents).toBe(5000)
      // changeDueCents is calculated by calcChangeDue helper separately
    })

    it('INITIATE_PAYMENT transitions to eftpos_confirm when method is eftpos', () => {
      const state = cartReducer(
        { ...initialCartState, paymentMethod: 'eftpos', items: [{ productId: 'p1', productName: 'X', unitPriceCents: 1000, quantity: 1, discountCents: 0, lineTotalCents: 1000, gstCents: 130 }] },
        { type: 'INITIATE_PAYMENT' }
      )
      expect(state.phase).toBe('eftpos_confirm')
    })

    it('INITIATE_PAYMENT transitions to cash_entry when method is cash', () => {
      const state = cartReducer(
        { ...initialCartState, paymentMethod: 'cash', items: [{ productId: 'p1', productName: 'X', unitPriceCents: 1000, quantity: 1, discountCents: 0, lineTotalCents: 1000, gstCents: 130 }] },
        { type: 'INITIATE_PAYMENT' }
      )
      expect(state.phase).toBe('cash_entry')
    })

    it('CONFIRM_EFTPOS transitions to processing', () => {
      const state = cartReducer(
        { ...initialCartState, phase: 'eftpos_confirm' },
        { type: 'CONFIRM_EFTPOS' }
      )
      expect(state.phase).toBe('processing')
    })

    it('VOID_SALE transitions to sale_void and clears completedOrderId', () => {
      const state = cartReducer(
        { ...initialCartState, completedOrderId: 'order-123', phase: 'processing' },
        { type: 'VOID_SALE' }
      )
      expect(state.phase).toBe('sale_void')
      expect(state.completedOrderId).toBeNull()
    })

    it('SALE_COMPLETE sets completedOrderId and phase to sale_complete', () => {
      const state = cartReducer(
        { ...initialCartState, phase: 'processing' },
        { type: 'SALE_COMPLETE', orderId: 'order-456' }
      )
      expect(state.phase).toBe('sale_complete')
      expect(state.completedOrderId).toBe('order-456')
    })

    it('NEW_SALE resets to initialCartState', () => {
      const dirtyState: CartState = {
        items: [{ productId: 'p1', productName: 'X', unitPriceCents: 1000, quantity: 1, discountCents: 0, lineTotalCents: 1000, gstCents: 130 }],
        paymentMethod: 'eftpos',
        cashTenderedCents: 5000,
        cartDiscountCents: 100,
        cartDiscountType: 'fixed',
        phase: 'sale_complete',
        completedOrderId: 'order-789',
        giftCardCode: null,
        giftCardBalanceCents: null,
        giftCardAmountCents: null,
        giftCardRemainingAfterCents: null,
        giftCardExpiresAt: null,
        splitRemainderMethod: null,
        attachedCustomerId: 'cust-123',
        attachedCustomerName: 'Jane',
        attachedCustomerPoints: 100,
        loyaltyDiscountCents: 50,
        loyaltyPointsRedeemed: 50,
      }
      const state = cartReducer(dirtyState, { type: 'NEW_SALE' })
      expect(state).toEqual(initialCartState)
    })
  })
})

describe('calcCartTotals', () => {
  it('returns correct subtotal, gst, and total for 3 items', () => {
    const items: CartItem[] = [
      { productId: 'p1', productName: 'A', unitPriceCents: 1000, quantity: 1, discountCents: 0, lineTotalCents: 1000, gstCents: 130 },
      { productId: 'p2', productName: 'B', unitPriceCents: 2000, quantity: 2, discountCents: 0, lineTotalCents: 4000, gstCents: 522 },
      { productId: 'p3', productName: 'C', unitPriceCents: 500, quantity: 3, discountCents: 100, lineTotalCents: 1400, gstCents: 183 },
    ]
    const totals = calcCartTotals(items)
    // subtotal = 1000 + 4000 + 1400 = 6400
    expect(totals.subtotalCents).toBe(6400)
    // gstCents = sum of line GSTs = 130 + 522 + 183 = 835
    expect(totals.gstCents).toBe(835)
    // totalCents = subtotalCents (tax-inclusive)
    expect(totals.totalCents).toBe(6400)
  })
})

describe('applyCartDiscount', () => {
  it('distributes discount pro-rata and recalculates GST per line', () => {
    const items: CartItem[] = [
      { productId: 'p1', productName: 'A', unitPriceCents: 1000, quantity: 1, discountCents: 0, lineTotalCents: 1000, gstCents: 130 },
      { productId: 'p2', productName: 'B', unitPriceCents: 3000, quantity: 1, discountCents: 0, lineTotalCents: 3000, gstCents: 391 },
    ]
    // 1000c discount across 4000c total
    // item1: Math.floor(1000 * 1000 / 4000) = 250
    // item2: 1000 - 250 = 750
    const result = applyCartDiscount(items, 1000)
    expect(result[0].discountCents).toBe(250)
    expect(result[1].discountCents).toBe(750)
    // recalculated line totals
    expect(result[0].lineTotalCents).toBe(750) // 1000 - 250
    expect(result[1].lineTotalCents).toBe(2250) // 3000 - 750
    // GST recalculated: Math.round(750 * 3/23) = 98, Math.round(2250*3/23) = 293
    expect(result[0].gstCents).toBe(Math.round(750 * 3 / 23))
    expect(result[1].gstCents).toBe(Math.round(2250 * 3 / 23))
  })
})

describe('calcChangeDue', () => {
  it('returns tendered minus total', () => {
    expect(calcChangeDue(4250, 5000)).toBe(750)
    expect(calcChangeDue(1000, 1000)).toBe(0)
    expect(calcChangeDue(2000, 1500)).toBe(-500) // under-tendered
  })
})
