'use client'

import type { CartItem } from '@/lib/cart'
import { calcCartTotals } from '@/lib/cart'
import { formatNZD } from '@/lib/money'

type CartSummaryProps = {
  items: CartItem[]
}

export function CartSummary({ items }: CartSummaryProps) {
  const { subtotalCents, gstCents, totalCents } = calcCartTotals(items)

  return (
    <div className="space-y-1">
      {/* Subtotal row */}
      <div className="flex justify-between">
        <span className="text-sm font-normal text-text">Subtotal</span>
        <span className="text-sm tabular-nums text-text">{formatNZD(subtotalCents)}</span>
      </div>

      {/* GST row — tax-inclusive NZ pattern */}
      <div className="flex justify-between">
        <span className="text-sm text-text-muted">Incl. GST</span>
        <span className="text-sm tabular-nums text-text-muted">{formatNZD(gstCents)}</span>
      </div>

      {/* Divider */}
      <div className="border-t border-border my-2" />

      {/* Total row */}
      <div className="flex justify-between items-baseline">
        <span className="text-xl font-bold text-text">Total</span>
        <span className="text-3xl font-display font-bold tabular-nums text-text">
          {formatNZD(totalCents)}
        </span>
      </div>
    </div>
  )
}
