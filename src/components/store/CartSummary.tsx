'use client'

import { useCart } from '@/contexts/CartContext'
import { formatNZD } from '@/lib/money'

export function CartSummary() {
  const { subtotalCents, discountCents, gstCents, totalCents } = useCart()

  return (
    <div className="space-y-2 py-4 border-t border-[var(--color-border)]">
      {/* Subtotal */}
      <div className="flex justify-between text-sm text-[var(--color-text-muted)]">
        <span>Subtotal</span>
        <span className="tabular-nums">{formatNZD(subtotalCents)}</span>
      </div>

      {/* Discount (only shown when applied) */}
      {discountCents > 0 && (
        <div className="flex justify-between text-sm text-[var(--color-error)]">
          <span>Discount</span>
          <span className="tabular-nums">-{formatNZD(discountCents)}</span>
        </div>
      )}

      {/* GST inclusive */}
      <div className="flex justify-between text-sm text-[var(--color-text-muted)]">
        <span>GST (incl.)</span>
        <span className="tabular-nums">{formatNZD(gstCents)}</span>
      </div>

      {/* Total */}
      <div className="flex justify-between text-base font-semibold text-[var(--color-text)] pt-2 border-t border-[var(--color-border)]">
        <span>Total</span>
        <span className="tabular-nums">{formatNZD(totalCents)}</span>
      </div>
    </div>
  )
}
