type StockBadgeProps = {
  quantity: number
  reorderThreshold: number
}

export function StockBadge({ quantity, reorderThreshold }: StockBadgeProps) {
  if (quantity === 0) {
    return (
      <span className="absolute top-1.5 right-1.5 bg-error text-white text-sm rounded-full px-2 py-0.5 font-sans leading-tight">
        Out of Stock
      </span>
    )
  }

  if (quantity <= reorderThreshold) {
    return (
      <span className="absolute top-1.5 right-1.5 bg-warning text-white text-sm rounded-full px-2 py-0.5 font-sans leading-tight">
        Low Stock
      </span>
    )
  }

  return (
    <span className="absolute top-1.5 right-1.5 bg-success text-white text-sm rounded-full px-2 py-0.5 font-sans leading-tight">
      {quantity}
    </span>
  )
}
