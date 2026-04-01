import Image from 'next/image'
import { formatNZD } from '@/lib/money'
import { StockBadge } from './StockBadge'
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

  // Generate a color from product name for image placeholder
  const placeholderColors = [
    'bg-navy', 'bg-amber', 'bg-info', 'bg-success', 'bg-warning',
  ]
  const colorIndex =
    product.name.charCodeAt(0) % placeholderColors.length
  const placeholderColor = placeholderColors[colorIndex]
  const initial = product.name.charAt(0).toUpperCase()

  return (
    <div
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      aria-disabled={isDisabled ? 'true' : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={[
        'relative bg-card rounded-lg border border-border shadow-[0_1px_4px_rgba(30,41,59,0.08)]',
        'min-w-[120px] min-h-[140px] flex flex-col cursor-pointer',
        'transition-transform active:scale-[0.97]',
        isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-[0_2px_8px_rgba(30,41,59,0.14)]',
        isInCart ? 'ring-2 ring-info ring-offset-1' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Product image or placeholder */}
      <div className="relative aspect-square w-full overflow-hidden rounded-t-lg bg-surface">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 160px"
          />
        ) : (
          <div
            className={`w-full h-full flex items-center justify-center ${placeholderColor}`}
          >
            <span className="text-white text-2xl font-bold font-display">{initial}</span>
          </div>
        )}

        {/* Stock badge */}
        <StockBadge
          quantity={product.stock_quantity}
          reorderThreshold={product.reorder_threshold}
        />

        {/* Cart quantity indicator */}
        {isInCart && cartQuantity > 0 && (
          <div className="absolute top-1.5 left-1.5 bg-info text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
            {cartQuantity}
          </div>
        )}
      </div>

      {/* Card content */}
      <div className="p-2 flex flex-col gap-1">
        <p className="text-sm font-normal text-text line-clamp-2 leading-tight">
          {product.name}
        </p>
        <p className="text-sm font-bold text-text tabular-nums">
          {formatNZD(product.price_cents)}
        </p>
      </div>
    </div>
  )
}
