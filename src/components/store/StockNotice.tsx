// Server Component — no 'use client' needed

interface StockNoticeProps {
  stockQuantity: number
  reorderThreshold: number
}

export function StockNotice({ stockQuantity, reorderThreshold }: StockNoticeProps) {
  if (stockQuantity <= 0 || stockQuantity > reorderThreshold) return null

  return (
    <p className="text-warning text-sm font-semibold">
      Only {stockQuantity} left
    </p>
  )
}
