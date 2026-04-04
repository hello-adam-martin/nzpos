'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCart } from '@/contexts/CartContext'
import { formatNZD } from '@/lib/money'
import { SoldOutBadge } from '@/components/store/SoldOutBadge'
import { StockNotice } from '@/components/store/StockNotice'

interface StoreProductCardProps {
  product: {
    id: string
    name: string
    slug: string | null
    priceCents: number
    imageUrl: string | null
    stockQuantity: number
    reorderThreshold: number
    productType?: string
  }
  hasInventory?: boolean
}

export function StoreProductCard({ product, hasInventory }: StoreProductCardProps) {
  const { dispatch } = useCart()
  const isService = product.productType === 'service'
  // D-13, D-14: hide sold-out state when free-tier or service product
  const isSoldOut = hasInventory === true && !isService && product.stockQuantity <= 0
  const isLowStock =
    hasInventory === true && !isService &&
    product.stockQuantity > 0 &&
    product.stockQuantity <= product.reorderThreshold

  const productHref = product.slug ? `/products/${product.slug}` : '#'

  function handleAddToCart() {
    if (isSoldOut) return
    dispatch({
      type: 'ADD_ITEM',
      product: {
        id: product.id,
        name: product.name,
        priceCents: product.priceCents,
        imageUrl: product.imageUrl,
        slug: product.slug,
        stockQuantity: product.stockQuantity,
      },
    })
    dispatch({ type: 'OPEN_DRAWER' })
  }

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden hover:shadow-[0_2px_8px_rgba(30,41,59,0.12)] transition-shadow duration-150 flex flex-col">
      {/* Image */}
      <Link href={productHref} className="block aspect-square relative bg-surface">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover rounded-t-lg"
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div
            className="w-full h-full bg-surface rounded-t-lg flex items-center justify-center"
            aria-label={`No image for ${product.name}`}
          >
            <span className="text-text-light text-sm">No image</span>
          </div>
        )}
        {isSoldOut && <SoldOutBadge />}
      </Link>

      {/* Details */}
      <div className="p-3 flex flex-col gap-1 flex-1">
        <Link
          href={productHref}
          className="text-base font-semibold text-navy hover:underline line-clamp-2"
        >
          {product.name}
        </Link>
        <p className="text-base font-semibold text-navy tabular-nums">
          {formatNZD(product.priceCents)}
        </p>
        {isLowStock && (
          <StockNotice
            stockQuantity={product.stockQuantity}
            reorderThreshold={product.reorderThreshold}
          />
        )}
      </div>

      {/* Add to Cart */}
      <button
        onClick={handleAddToCart}
        disabled={isSoldOut}
        aria-disabled={isSoldOut}
        className={`w-full py-3 bg-amber text-white font-semibold rounded-b-lg min-h-[44px] active:scale-[0.97] transition-transform duration-100${
          isSoldOut ? ' opacity-50 cursor-not-allowed' : ''
        }`}
      >
        Add to Cart
      </button>
    </div>
  )
}
