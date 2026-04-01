'use client'

import { X } from 'lucide-react'
import type { CartItem } from '@/lib/cart'
import { formatNZD } from '@/lib/money'
import { QuantityControl } from './QuantityControl'

type CartLineItemProps = {
  item: CartItem
  onSetQuantity: (qty: number) => void
  onRemove: () => void
  onOpenDiscount: () => void
}

export function CartLineItem({ item, onSetQuantity, onRemove, onOpenDiscount }: CartLineItemProps) {
  // Compute discount indicator text
  let discountLabel: string | null = null
  if (item.discountCents > 0) {
    if (item.discountType === 'percentage') {
      // Compute percentage from original line value before discount
      const originalLineCents = item.unitPriceCents * item.quantity
      const percent = originalLineCents > 0
        ? Math.round((item.discountCents / originalLineCents) * 100)
        : 0
      discountLabel = `${percent}% off`
    } else {
      discountLabel = `${formatNZD(item.discountCents)} off`
    }
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 min-h-[48px] bg-card rounded">
      {/* Left: product name + discount indicator */}
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={onOpenDiscount}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpenDiscount() }}
        aria-label={`Apply discount to ${item.productName}`}
      >
        <p className="text-base font-normal truncate text-text">{item.productName}</p>
        {discountLabel && (
          <p className="text-sm text-muted-foreground discountCents leading-tight">{discountLabel}</p>
        )}
      </div>

      {/* Center: quantity controls */}
      <QuantityControl
        quantity={item.quantity}
        onIncrement={() => onSetQuantity(item.quantity + 1)}
        onDecrement={() => onSetQuantity(item.quantity - 1)}
      />

      {/* Right: line total */}
      <span className="text-base font-bold tabular-nums text-text min-w-[64px] text-right">
        {formatNZD(item.lineTotalCents)}
      </span>

      {/* Remove button — padded to 36px min touch target */}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${item.productName} from order`}
        className="flex items-center justify-center w-6 h-6 min-w-[36px] min-h-[36px] text-text-muted hover:text-error transition-colors"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  )
}
