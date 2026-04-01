import { formatNZD } from '@/lib/money'
import type { Database } from '@/types/database'

type ProductRow = Database['public']['Tables']['products']['Row']

type ProductCardProps = {
  product: ProductRow
  onAddToCart: (product: ProductRow) => void
  isInCart: boolean
  cartQuantity: number
  staffRole: 'owner' | 'staff'
}

export function ProductCard({
  product,
  onAddToCart,
  isInCart,
  cartQuantity,
  staffRole,
}: ProductCardProps) {
  const isOutOfStock = product.stock_quantity === 0
  const isLowStock =
    product.stock_quantity > 0 &&
    product.stock_quantity <= product.reorder_threshold
  const isDisabled = isOutOfStock && staffRole !== 'owner'

  function handleClick() {
    if (!isDisabled) {
      onAddToCart(product)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isDisabled && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      onAddToCart(product)
    }
  }

  return (
    <div
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      aria-disabled={isDisabled ? 'true' : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={[
        'relative bg-card rounded-lg border p-3.5 text-center cursor-pointer',
        'transition-[border-color,transform] duration-150 active:scale-[0.97]',
        isDisabled
          ? 'opacity-50 cursor-not-allowed border-border'
          : 'border-border hover:border-navy',
        isInCart ? 'ring-2 ring-info ring-offset-1' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Cart quantity badge */}
      {isInCart && cartQuantity > 0 && (
        <div className="absolute -top-2 -right-2 bg-info text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
          {cartQuantity}
        </div>
      )}

      <p className="text-sm font-semibold text-text leading-tight line-clamp-2">
        {product.name}
      </p>
      <p className="text-sm text-text-muted mt-1 tabular-nums">
        {formatNZD(product.price_cents)}
      </p>
      <p
        className={[
          'text-xs mt-1',
          isOutOfStock
            ? 'text-error font-semibold'
            : isLowStock
              ? 'text-warning'
              : 'text-text-light',
        ].join(' ')}
      >
        {isOutOfStock
          ? 'Out of stock'
          : `${product.stock_quantity} in stock`}
      </p>
    </div>
  )
}
