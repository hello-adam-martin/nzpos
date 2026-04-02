'use client'

import { useEffect, useRef } from 'react'
import { useCart } from '@/contexts/CartContext'

const CART_STORAGE_KEY = 'nzpos_store_cart'

/**
 * CartClearer — renders nothing visible.
 * Clears the cart after a successful order so the customer starts fresh.
 *
 * Race condition: CartProvider hydrate effect (parent) runs AFTER this
 * component's effect (child effects fire first in React). So CLEAR_CART
 * would be overwritten by HYDRATE reading stale localStorage.
 *
 * Fix: clear localStorage synchronously during first render (before any
 * effects run), so hydrate finds nothing. Then dispatch CLEAR_CART in an
 * effect to also reset in-memory state.
 */
export default function CartClearer() {
  const { dispatch } = useCart()
  const cleared = useRef(false)

  // Clear localStorage synchronously during render — before hydrate effect
  if (!cleared.current) {
    try {
      localStorage.removeItem(CART_STORAGE_KEY)
    } catch {
      // Storage unavailable — ignore
    }
    cleared.current = true
  }

  // Also dispatch to clear in-memory state (catches any already-hydrated state)
  useEffect(() => {
    dispatch({ type: 'CLEAR_CART' })
  }, [dispatch])

  return null
}
