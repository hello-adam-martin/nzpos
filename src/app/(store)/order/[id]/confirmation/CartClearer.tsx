'use client'

import { useEffect } from 'react'
import { useCart } from '@/contexts/CartContext'

/**
 * CartClearer — renders nothing visible.
 * Clears the cart on mount after a successful order so the customer starts fresh.
 */
export default function CartClearer() {
  const { dispatch } = useCart()

  useEffect(() => {
    dispatch({ type: 'CLEAR_CART' })
  }, [dispatch])

  return null
}
