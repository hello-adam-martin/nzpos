/**
 * POS Cart state machine — useReducer-compatible.
 *
 * GST is computed per-line on discounted amounts using calcLineItem from gst.ts.
 * All monetary values are integer cents. No floats.
 */

import { calcLineItem, calcOrderGST } from '@/lib/gst'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CartItem = {
  productId: string
  productName: string
  unitPriceCents: number
  quantity: number
  discountCents: number       // per-line discount in cents (includes cart discount share)
  discountType?: 'percentage' | 'fixed'
  discountReason?: string     // 'staff' | 'damaged' | 'loyalty' | 'other'
  lineTotalCents: number      // unitPriceCents * quantity - discountCents
  gstCents: number            // calcLineItem result
}

export type CartState = {
  items: CartItem[]
  paymentMethod: 'eftpos' | 'cash' | 'gift_card' | null
  cashTenderedCents: number | null
  cartDiscountCents: number
  cartDiscountType: 'percentage' | 'fixed' | null
  phase: 'idle' | 'eftpos_confirm' | 'cash_entry' | 'gift_card_entry' | 'gift_card_confirmed' | 'processing' | 'sale_complete' | 'sale_void'
  completedOrderId: string | null
  // Gift card fields (all null when not using gift card payment)
  giftCardCode: string | null               // raw 8-digit code (no dash)
  giftCardBalanceCents: number | null       // validated balance from server
  giftCardAmountCents: number | null        // amount to charge to gift card
  giftCardRemainingAfterCents: number | null // balance after this sale
  giftCardExpiresAt: string | null          // ISO string for display
  splitRemainderMethod: 'eftpos' | 'cash' | null  // for split payments
  // Loyalty / customer attachment (all null when no customer attached)
  attachedCustomerId: string | null
  attachedCustomerName: string | null
  attachedCustomerPoints: number | null
  loyaltyDiscountCents: number | null
  loyaltyPointsRedeemed: number | null
}

export type CartAction =
  | { type: 'ADD_PRODUCT'; product: { id: string; name: string; price_cents: number; stock_quantity: number; [key: string]: unknown } }
  | { type: 'SET_QUANTITY'; productId: string; quantity: number }
  | { type: 'REMOVE_ITEM'; productId: string }
  | { type: 'APPLY_LINE_DISCOUNT'; productId: string; discountCents: number; discountType?: 'percentage' | 'fixed'; reason?: string }
  | { type: 'APPLY_CART_DISCOUNT'; discountCents: number; discountType: 'percentage' | 'fixed' }
  | { type: 'SET_PAYMENT_METHOD'; method: 'eftpos' | 'cash' | 'gift_card' }
  | { type: 'SET_CASH_TENDERED'; cents: number }
  | { type: 'INITIATE_PAYMENT' }
  | { type: 'CONFIRM_EFTPOS' }
  | { type: 'VOID_SALE' }
  | { type: 'SALE_COMPLETE'; orderId: string }
  | { type: 'NEW_SALE' }
  | { type: 'ENTER_GIFT_CARD_CODE'; code: string }
  | { type: 'GIFT_CARD_VALIDATED'; balanceCents: number; expiresAt: string }
  | { type: 'GIFT_CARD_VALIDATION_FAILED' }
  | { type: 'SET_SPLIT_REMAINDER_METHOD'; method: 'eftpos' | 'cash' }
  | { type: 'ATTACH_CUSTOMER'; customerId: string; name: string; pointsBalance: number }
  | { type: 'DETACH_CUSTOMER' }
  | { type: 'APPLY_LOYALTY_DISCOUNT'; discountCents: number; pointsRedeemed: number }
  | { type: 'REMOVE_LOYALTY_DISCOUNT' }

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

export const initialCartState: CartState = {
  items: [],
  paymentMethod: null,
  cashTenderedCents: null,
  cartDiscountCents: 0,
  cartDiscountType: null,
  phase: 'idle',
  completedOrderId: null,
  giftCardCode: null,
  giftCardBalanceCents: null,
  giftCardAmountCents: null,
  giftCardRemainingAfterCents: null,
  giftCardExpiresAt: null,
  splitRemainderMethod: null,
  attachedCustomerId: null,
  attachedCustomerName: null,
  attachedCustomerPoints: null,
  loyaltyDiscountCents: null,
  loyaltyPointsRedeemed: null,
}

// ---------------------------------------------------------------------------
// Helper: recompute a CartItem's lineTotalCents and gstCents
// ---------------------------------------------------------------------------

function recalcItem(item: CartItem): CartItem {
  const { lineTotal, gst } = calcLineItem(item.unitPriceCents, item.quantity, item.discountCents)
  return { ...item, lineTotalCents: lineTotal, gstCents: gst }
}

// ---------------------------------------------------------------------------
// Helper: compute cart total (sum of line totals after discounts)
// ---------------------------------------------------------------------------

function calcTotal(state: CartState): number {
  return state.items.reduce((sum, i) => sum + i.lineTotalCents, 0)
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_PRODUCT': {
      const existing = state.items.find(i => i.productId === action.product.id)
      if (existing) {
        const updated = state.items.map(i =>
          i.productId === action.product.id
            ? recalcItem({ ...i, quantity: i.quantity + 1 })
            : i
        )
        return { ...state, items: updated }
      }
      const { lineTotal, gst } = calcLineItem(action.product.price_cents, 1, 0)
      const newItem: CartItem = {
        productId: action.product.id,
        productName: action.product.name,
        unitPriceCents: action.product.price_cents,
        quantity: 1,
        discountCents: 0,
        lineTotalCents: lineTotal,
        gstCents: gst,
      }
      return { ...state, items: [...state.items, newItem] }
    }

    case 'SET_QUANTITY': {
      if (action.quantity <= 0) {
        return { ...state, items: state.items.filter(i => i.productId !== action.productId) }
      }
      const updated = state.items.map(i =>
        i.productId === action.productId
          ? recalcItem({ ...i, quantity: action.quantity })
          : i
      )
      return { ...state, items: updated }
    }

    case 'REMOVE_ITEM': {
      return { ...state, items: state.items.filter(i => i.productId !== action.productId) }
    }

    case 'APPLY_LINE_DISCOUNT': {
      const updated = state.items.map(i => {
        if (i.productId !== action.productId) return i
        return recalcItem({
          ...i,
          discountCents: action.discountCents,
          discountType: action.discountType,
          discountReason: action.reason,
        })
      })
      return { ...state, items: updated }
    }

    case 'APPLY_CART_DISCOUNT': {
      const { discountCents, discountType } = action
      const updatedItems = applyCartDiscount(state.items, discountCents)
      return {
        ...state,
        items: updatedItems,
        cartDiscountCents: discountCents,
        cartDiscountType: discountType,
      }
    }

    case 'SET_PAYMENT_METHOD': {
      return { ...state, paymentMethod: action.method }
    }

    case 'SET_CASH_TENDERED': {
      return { ...state, cashTenderedCents: action.cents }
    }

    case 'INITIATE_PAYMENT': {
      if (state.paymentMethod === 'eftpos') {
        return { ...state, phase: 'eftpos_confirm' }
      }
      if (state.paymentMethod === 'cash') {
        return { ...state, phase: 'cash_entry' }
      }
      if (state.paymentMethod === 'gift_card') {
        return { ...state, phase: 'gift_card_entry' }
      }
      return state
    }

    case 'ENTER_GIFT_CARD_CODE': {
      // Strip non-digits, store raw code
      const raw = action.code.replace(/\D/g, '')
      return { ...state, giftCardCode: raw }
    }

    case 'GIFT_CARD_VALIDATED': {
      const totalCents = calcTotal(state)
      const giftCardAmountCents = Math.min(action.balanceCents, totalCents)
      const giftCardRemainingAfterCents = action.balanceCents - giftCardAmountCents

      // If gift card fully covers the total, transition to confirmed
      if (giftCardAmountCents >= totalCents) {
        return {
          ...state,
          giftCardBalanceCents: action.balanceCents,
          giftCardAmountCents,
          giftCardRemainingAfterCents,
          giftCardExpiresAt: action.expiresAt,
          phase: 'gift_card_confirmed',
        }
      }

      // Partial cover — stay in gift_card_entry, wait for SET_SPLIT_REMAINDER_METHOD
      return {
        ...state,
        giftCardBalanceCents: action.balanceCents,
        giftCardAmountCents,
        giftCardRemainingAfterCents,
        giftCardExpiresAt: action.expiresAt,
        phase: 'gift_card_entry',
      }
    }

    case 'GIFT_CARD_VALIDATION_FAILED': {
      return {
        ...state,
        giftCardCode: null,
        giftCardBalanceCents: null,
        giftCardAmountCents: null,
        giftCardRemainingAfterCents: null,
        giftCardExpiresAt: null,
        splitRemainderMethod: null,
        phase: 'gift_card_entry',
      }
    }

    case 'SET_SPLIT_REMAINDER_METHOD': {
      return {
        ...state,
        splitRemainderMethod: action.method,
        phase: 'gift_card_confirmed',
      }
    }

    case 'CONFIRM_EFTPOS': {
      return { ...state, phase: 'processing' }
    }

    case 'VOID_SALE': {
      return { ...state, phase: 'sale_void', completedOrderId: null }
    }

    case 'SALE_COMPLETE': {
      return { ...state, phase: 'sale_complete', completedOrderId: action.orderId }
    }

    case 'NEW_SALE': {
      return { ...initialCartState }
    }

    case 'ATTACH_CUSTOMER': {
      return {
        ...state,
        attachedCustomerId: action.customerId,
        attachedCustomerName: action.name,
        attachedCustomerPoints: action.pointsBalance,
      }
    }

    case 'DETACH_CUSTOMER': {
      return {
        ...state,
        attachedCustomerId: null,
        attachedCustomerName: null,
        attachedCustomerPoints: null,
        loyaltyDiscountCents: null,
        loyaltyPointsRedeemed: null,
      }
    }

    case 'APPLY_LOYALTY_DISCOUNT': {
      return {
        ...state,
        loyaltyDiscountCents: action.discountCents,
        loyaltyPointsRedeemed: action.pointsRedeemed,
      }
    }

    case 'REMOVE_LOYALTY_DISCOUNT': {
      return {
        ...state,
        loyaltyDiscountCents: null,
        loyaltyPointsRedeemed: null,
      }
    }

    default:
      return state
  }
}

// ---------------------------------------------------------------------------
// calcCartTotals
// ---------------------------------------------------------------------------

/**
 * Calculates cart totals from all line items.
 * NZ tax-inclusive: total equals subtotal (GST is already inside prices).
 *
 * @param items - Array of cart items with pre-calculated line totals and GST
 * @returns Object with subtotalCents, gstCents, and totalCents
 */
export function calcCartTotals(items: CartItem[]): {
  subtotalCents: number
  gstCents: number
  totalCents: number
} {
  const subtotalCents = items.reduce((sum, i) => sum + i.lineTotalCents, 0)
  const gstCents = calcOrderGST(items.map(i => i.gstCents))
  // NZ is tax-inclusive: total === subtotal (GST is already inside the price)
  return { subtotalCents, gstCents, totalCents: subtotalCents }
}

// ---------------------------------------------------------------------------
// applyCartDiscount — distribute pro-rata by line total
// ---------------------------------------------------------------------------

/**
 * Distributes a cart-level discount pro-rata across all line items.
 * Last item absorbs any rounding remainder to ensure discount sums exactly.
 *
 * @param items - Current cart items
 * @param cartDiscountCents - Total cart discount to distribute in cents
 * @returns New array of cart items with discount applied and line totals recalculated
 */
export function applyCartDiscount(items: CartItem[], cartDiscountCents: number): CartItem[] {
  if (items.length === 0) return items

  const totalLineValue = items.reduce((sum, i) => sum + i.lineTotalCents, 0)
  if (totalLineValue === 0) return items

  let remainingDiscount = cartDiscountCents
  const result: CartItem[] = []

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx]
    const isLast = idx === items.length - 1

    // Pro-rata share: last item absorbs any rounding remainder
    const share = isLast
      ? remainingDiscount
      : Math.floor(cartDiscountCents * item.lineTotalCents / totalLineValue)

    remainingDiscount -= share

    const updatedDiscount = item.discountCents + share
    const { lineTotal, gst } = calcLineItem(item.unitPriceCents, item.quantity, updatedDiscount)
    result.push({
      ...item,
      discountCents: updatedDiscount,
      lineTotalCents: lineTotal,
      gstCents: gst,
    })
  }

  return result
}

// ---------------------------------------------------------------------------
// calcChangeDue
// ---------------------------------------------------------------------------

/**
 * Calculates change due to the customer for a cash transaction.
 *
 * @param totalCents - Order total in cents
 * @param tenderedCents - Cash amount tendered by customer in cents
 * @returns Change due in cents (may be negative if tendered < total)
 */
export function calcChangeDue(totalCents: number, tenderedCents: number): number {
  return tenderedCents - totalCents
}
