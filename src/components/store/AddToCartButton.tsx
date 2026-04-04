'use client'

import { useCart } from '@/contexts/CartContext'

interface AddToCartButtonProps {
  product: {
    id: string
    name: string
    price_cents: number
    image_url: string | null
    slug: string | null
    stock_quantity: number
    product_type?: string
  }
  hasInventory?: boolean
}

export function AddToCartButton({ product, hasInventory }: AddToCartButtonProps) {
  const { dispatch, state } = useCart()
  const isService = product.product_type === 'service'
  // FREE-02, POS-04: service products and free-tier stores are never sold out
  const isSoldOut = hasInventory === true && !isService && product.stock_quantity <= 0
  const inCart = state.items.find((i) => i.productId === product.id)

  function handleAddToCart() {
    if (isSoldOut) return
    dispatch({
      type: 'ADD_ITEM',
      product: {
        id: product.id,
        name: product.name,
        priceCents: product.price_cents,
        imageUrl: product.image_url,
        slug: product.slug,
        stockQuantity: product.stock_quantity,
      },
    })
    dispatch({ type: 'OPEN_DRAWER' })
  }

  return (
    <button
      onClick={handleAddToCart}
      disabled={isSoldOut}
      aria-disabled={isSoldOut}
      className={`py-3 px-8 bg-amber text-white font-semibold rounded-lg min-h-[44px] w-full md:w-auto active:scale-[0.97] transition-transform duration-100${
        isSoldOut ? ' opacity-50 cursor-not-allowed' : ''
      }`}
    >
      {isSoldOut ? 'Sold Out' : inCart ? 'Add Another' : 'Add to Cart'}
    </button>
  )
}
