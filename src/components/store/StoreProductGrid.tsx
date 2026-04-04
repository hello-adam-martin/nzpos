// Server Component — no 'use client' needed

import { StoreProductCard } from '@/components/store/StoreProductCard'

interface Product {
  id: string
  name: string
  slug: string | null
  priceCents: number
  imageUrl: string | null
  stockQuantity: number
  reorderThreshold: number
  productType?: string
}

interface StoreProductGridProps {
  products: Product[]
  hasSearch?: boolean
  hasCategory?: boolean
  hasInventory?: boolean
}

export function StoreProductGrid({
  products,
  hasSearch = false,
  hasCategory = false,
  hasInventory,
}: StoreProductGridProps) {
  if (products.length === 0) {
    const message = hasSearch
      ? 'No products match your search. Try browsing all products.'
      : hasCategory
        ? 'No products in this category'
        : 'No products available.'

    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-text-muted text-base text-center">{message}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-4 lg:grid-cols-4 lg:gap-4">
      {products.map((product) => (
        <StoreProductCard key={product.id} product={product} hasInventory={hasInventory} />
      ))}
    </div>
  )
}
