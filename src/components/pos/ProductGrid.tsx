import { useRef } from 'react'
import { ProductCard } from './ProductCard'
import type { CartState } from '@/lib/cart'
import type { Database } from '@/types/database'

type ProductRow = Database['public']['Tables']['products']['Row']

type ProductGridProps = {
  products: ProductRow[]
  cart: CartState
  onAddToCart: (product: ProductRow) => void
  staffRole: 'owner' | 'staff'
  search: string
  onSearchChange: (value: string) => void
  searchInputRef?: React.RefObject<HTMLInputElement | null>
}

export function ProductGrid({
  products,
  cart,
  onAddToCart,
  staffRole,
  search,
  onSearchChange,
  searchInputRef,
}: ProductGridProps) {
  // Use the forwarded ref if provided, otherwise create a local one (unused)
  const localRef = useRef<HTMLInputElement>(null)
  const resolvedSearchRef = searchInputRef ?? localRef
  function handleSkuKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      const skuInput = e.currentTarget.value.trim()
      if (!skuInput) return
      const match = products.find(
        (p) => p.sku?.toLowerCase() === skuInput.toLowerCase()
      )
      if (match) {
        onAddToCart(match)
        e.currentTarget.value = ''
      }
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search + SKU quick-entry */}
      <div className="flex gap-2 px-4 pt-3 pb-2 shrink-0">
        <input
          ref={resolvedSearchRef}
          type="search"
          inputMode="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search products..."
          className="flex-1 text-base h-11 px-3 rounded-md border border-border bg-card text-text placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-navy/30"
        />
        <input
          type="text"
          inputMode="text"
          placeholder="SKU #"
          onKeyDown={handleSkuKeyDown}
          className="w-28 text-base h-11 px-3 rounded-md border border-border bg-card text-text placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-navy/30 font-mono"
        />
      </div>

      {/* Product grid or empty state */}
      {products.length === 0 ? (
        <div className="flex-1 flex items-center justify-center px-6 py-8 text-center">
          <p className="text-sm text-text-muted">
            {search
              ? `No products match "${search}"`
              : 'No products available.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3 p-4 bg-border rounded-lg">
          {products.map((product) => {
            const cartItem = cart.items.find(
              (i) => i.productId === product.id
            )
            return (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={onAddToCart}
                isInCart={!!cartItem}
                cartQuantity={cartItem?.quantity ?? 0}
                staffRole={staffRole}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
