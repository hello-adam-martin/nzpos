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
  paymentMethod: 'eftpos' | 'cash' | null
  cashTenderedCents: number | null
  cartDiscountCents: number
  cartDiscountType: 'percentage' | 'fixed' | null
  phase: 'idle' | 'eftpos_confirm' | 'cash_entry' | 'processing' | 'sale_complete' | 'sale_void'
  completedOrderId: string | null
}

export type CartAction =
  | { type: 'ADD_PRODUCT'; product: { id: string; name: string; price_cents: number; stock_quantity: number; [key: string]: unknown } }
  | { type: 'SET_QUANTITY'; productId: string; quantity: number }
  | { type: 'REMOVE_ITEM'; productId: string }
  | { type: 'APPLY_LINE_DISCOUNT'; productId: string; discountCents: number; discountType?: 'percentage' | 'fixed'; reason?: string }
  | { type: 'APPLY_CART_DISCOUNT'; discountCents: number; discountType: 'percentage' | 'fixed' }
  | { type: 'SET_PAYMENT_METHOD'; method: 'eftpos' | 'cash' }
  | { type: 'SET_CASH_TENDERED'; cents: number }
  | { type: 'INITIATE_PAYMENT' }
  | { type: 'CONFIRM_EFTPOS' }
  | { type: 'VOID_SALE' }
  | { type: 'SALE_COMPLETE'; orderId: string }
  | { type: 'NEW_SALE' }

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
}

// ---------------------------------------------------------------------------
// Helper: recompute a CartItem's lineTotalCents and gstCents
// ---------------------------------------------------------------------------

function recalcItem(item: CartItem): CartItem {
  const { lineTotal, gst } = calcLineItem(item.unitPriceCents, item.quantity, item.discountCents)
  return { ...item, lineTotalCents: lineTotal, gstCents: gst }
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
      return state
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

    default:
      return state
  }
}

// ---------------------------------------------------------------------------
// calcCartTotals
// ---------------------------------------------------------------------------

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

export function calcChangeDue(totalCents: number, tenderedCents: number): number {
  return tenderedCents - totalCents
}
