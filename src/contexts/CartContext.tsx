'use client'

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  useMemo,
  type ReactNode,
} from 'react'
import { calcLineItem, calcOrderGST } from '@/lib/gst'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StoreCartItem = {
  productId: string
  productName: string
  unitPriceCents: number
  quantity: number
  imageUrl: string | null
  slug: string | null
  maxStock: number // tracks available stock for sold-out check
}

export type StoreCartState = {
  items: StoreCartItem[]
  promoCode: string | null
  promoDiscountCents: number
  promoDiscountType: 'percentage' | 'fixed' | null
  isDrawerOpen: boolean
}

export type StoreCartAction =
  | {
      type: 'ADD_ITEM'
      product: {
        id: string
        name: string
        priceCents: number
        imageUrl: string | null
        slug: string | null
        stockQuantity: number
      }
    }
  | { type: 'SET_QUANTITY'; productId: string; quantity: number }
  | { type: 'REMOVE_ITEM'; productId: string }
  | {
      type: 'APPLY_PROMO'
      code: string
      discountCents: number
      discountType: 'percentage' | 'fixed'
    }
  | { type: 'CLEAR_PROMO' }
  | { type: 'CLEAR_CART' }
  | { type: 'TOGGLE_DRAWER' }
  | { type: 'OPEN_DRAWER' }
  | { type: 'CLOSE_DRAWER' }
  | { type: 'HYDRATE'; payload: StoreCartState }

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CART_STORAGE_KEY = 'nzpos_store_cart'

const initialState: StoreCartState = {
  items: [],
  promoCode: null,
  promoDiscountCents: 0,
  promoDiscountType: null,
  isDrawerOpen: false,
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function cartReducer(
  state: StoreCartState,
  action: StoreCartAction
): StoreCartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const { id, name, priceCents, imageUrl, slug, stockQuantity } =
        action.product

      // STORE-08: reject add if product is sold out
      if (stockQuantity <= 0) return state

      const existing = state.items.find((item) => item.productId === id)
      if (existing) {
        // Increment quantity up to maxStock
        const newQty = Math.min(existing.quantity + 1, existing.maxStock)
        return {
          ...state,
          items: state.items.map((item) =>
            item.productId === id ? { ...item, quantity: newQty } : item
          ),
        }
      }

      // Add new item
      const newItem: StoreCartItem = {
        productId: id,
        productName: name,
        unitPriceCents: priceCents,
        quantity: 1,
        imageUrl,
        slug,
        maxStock: stockQuantity,
      }
      return { ...state, items: [...state.items, newItem] }
    }

    case 'SET_QUANTITY': {
      const { productId, quantity } = action
      if (quantity <= 0) {
        // Remove item when quantity set to 0
        return {
          ...state,
          items: state.items.filter((item) => item.productId !== productId),
        }
      }
      return {
        ...state,
        items: state.items.map((item) =>
          item.productId === productId
            ? {
                ...item,
                // Clamp to [1, maxStock]
                quantity: Math.max(1, Math.min(quantity, item.maxStock)),
              }
            : item
        ),
      }
    }

    case 'REMOVE_ITEM': {
      return {
        ...state,
        items: state.items.filter(
          (item) => item.productId !== action.productId
        ),
      }
    }

    case 'APPLY_PROMO': {
      return {
        ...state,
        promoCode: action.code,
        promoDiscountCents: action.discountCents,
        promoDiscountType: action.discountType,
      }
    }

    case 'CLEAR_PROMO': {
      return {
        ...state,
        promoCode: null,
        promoDiscountCents: 0,
        promoDiscountType: null,
      }
    }

    case 'CLEAR_CART': {
      return { ...initialState, isDrawerOpen: false }
    }

    case 'TOGGLE_DRAWER': {
      return { ...state, isDrawerOpen: !state.isDrawerOpen }
    }

    case 'OPEN_DRAWER': {
      return { ...state, isDrawerOpen: true }
    }

    case 'CLOSE_DRAWER': {
      return { ...state, isDrawerOpen: false }
    }

    case 'HYDRATE': {
      // Always start with drawer closed (never persist open state)
      return { ...action.payload, isDrawerOpen: false }
    }

    default:
      return state
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

type CartContextValue = {
  state: StoreCartState
  dispatch: React.Dispatch<StoreCartAction>
  itemCount: number
  subtotalCents: number
  discountCents: number
  totalCents: number
  gstCents: number
}

const CartContext = createContext<CartContextValue | null>(null)

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState)
  const hydrated = useRef(false)

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as StoreCartState
        dispatch({ type: 'HYDRATE', payload: parsed })
      }
    } catch {
      // Corrupt or missing localStorage — ignore and use default state
    }
    hydrated.current = true
  }, [])

  // Persist to localStorage when state changes (exclude isDrawerOpen)
  // Skip persisting until hydration has run to avoid writing empty initial state
  useEffect(() => {
    if (!hydrated.current) return
    try {
      const { isDrawerOpen: _, ...persistable } = state
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(persistable))
    } catch {
      // Storage quota exceeded or unavailable — ignore
    }
  }, [state])

  // ---------------------------------------------------------------------------
  // Computed values (memoised)
  // ---------------------------------------------------------------------------

  const itemCount = useMemo(
    () => state.items.reduce((sum, item) => sum + item.quantity, 0),
    [state.items]
  )

  const subtotalCents = useMemo(
    () =>
      state.items.reduce(
        (sum, item) => sum + item.unitPriceCents * item.quantity,
        0
      ),
    [state.items]
  )

  const discountCents = state.promoDiscountCents

  const totalCents = useMemo(
    () => Math.max(0, subtotalCents - discountCents),
    [subtotalCents, discountCents]
  )

  /**
   * GST calculation with promo discount (D-19):
   * Distribute discount pro-rata across lines, then calcLineItem on each
   * discounted amount, then calcOrderGST.
   *
   * Mirrors applyCartDiscount algorithm from cart.ts (Math.floor for all,
   * last item absorbs rounding remainder) but operates on StoreCartItem.
   */
  const gstCents = useMemo(() => {
    if (state.items.length === 0) return 0

    const subtotal = state.items.reduce(
      (sum, item) => sum + item.unitPriceCents * item.quantity,
      0
    )
    const discount = state.promoDiscountCents
    const lineGSTs: number[] = []

    if (discount <= 0 || subtotal <= 0) {
      // No discount — straightforward per-line GST
      for (const item of state.items) {
        const { gst } = calcLineItem(item.unitPriceCents, item.quantity)
        lineGSTs.push(gst)
      }
    } else {
      // Distribute discount pro-rata: Math.floor for each item, last item absorbs remainder
      let allocated = 0
      const lineDiscounts: number[] = []

      for (let i = 0; i < state.items.length; i++) {
        const item = state.items[i]
        const lineTotal = item.unitPriceCents * item.quantity

        if (i === state.items.length - 1) {
          // Last item absorbs rounding remainder
          lineDiscounts.push(discount - allocated)
        } else {
          const share = Math.floor((lineTotal / subtotal) * discount)
          lineDiscounts.push(share)
          allocated += share
        }
      }

      for (let i = 0; i < state.items.length; i++) {
        const item = state.items[i]
        const { gst } = calcLineItem(
          item.unitPriceCents,
          item.quantity,
          lineDiscounts[i]
        )
        lineGSTs.push(gst)
      }
    }

    return calcOrderGST(lineGSTs)
  }, [state.items, state.promoDiscountCents])

  const value: CartContextValue = {
    state,
    dispatch,
    itemCount,
    subtotalCents,
    discountCents,
    totalCents,
    gstCents,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return ctx
}
