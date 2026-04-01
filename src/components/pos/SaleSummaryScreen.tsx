'use client'

import { CheckCircle } from 'lucide-react'
import type { CartItem } from '@/lib/cart'
import { formatNZD } from '@/lib/money'
import { calcCartTotals } from '@/lib/cart'

type SaleSummaryScreenProps = {
  items: CartItem[]
  totalCents: number
  gstCents: number
  paymentMethod: string
  orderId: string
  cashTenderedCents?: number
  changeDueCents?: number
  onNewSale: () => void
}

function paymentLabel(method: string): string {
  if (method === 'eftpos') return 'EFTPOS'
  if (method === 'cash') return 'Cash'
  if (method === 'split') return 'Split (Cash + EFTPOS)'
  return method.toUpperCase()
}

export function SaleSummaryScreen({
  items,
  totalCents,
  gstCents,
  paymentMethod,
  orderId,
  cashTenderedCents,
  changeDueCents,
  onNewSale,
}: SaleSummaryScreenProps) {
  const totals = calcCartTotals(items)
  const subtotalCents = totals.subtotalCents

  return (
    <div
      className="fixed inset-0 z-50 bg-navy-dark/80 flex items-center justify-center animate-[fadeIn_150ms_ease-out]"
      role="dialog"
      aria-modal="true"
      aria-label="Sale complete"
    >
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex flex-col items-center py-8 px-4 border-b border-border">
          <CheckCircle size={48} className="text-success mb-3" />
          <h1 className="text-xl font-bold text-success text-center">
            Sale recorded. Stock updated.
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Sale ID: {orderId.slice(0, 8).toUpperCase()}
          </p>
        </div>

        {/* Items list */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
          <h2 className="text-sm font-bold text-text-muted uppercase tracking-wide mb-2">
            Items
          </h2>
          <div className="space-y-1">
            {items.map((item) => (
              <div
                key={item.productId}
                className="flex items-center justify-between py-2 border-b border-border-light"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-base text-text truncate">{item.productName}</p>
                  {item.discountCents > 0 && (
                    <p className="text-sm text-text-muted">
                      {item.discountType === 'percentage'
                        ? `${Math.round(item.discountCents / (item.unitPriceCents * item.quantity) * 100)}% off`
                        : `${formatNZD(item.discountCents)} off`}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 ml-3">
                  <span className="text-sm text-text-muted">×{item.quantity}</span>
                  <span className="text-base font-bold text-text tabular-nums">
                    {formatNZD(item.lineTotalCents)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="px-4 py-4 border-t border-border space-y-2">
          {/* Subtotal */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-text-muted">Subtotal</span>
            <span className="text-sm tabular-nums">{formatNZD(subtotalCents)}</span>
          </div>

          {/* GST */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-text-muted">GST (15% incl.)</span>
            <span className="text-sm text-text-muted tabular-nums">{formatNZD(gstCents)}</span>
          </div>

          {/* Total */}
          <div className="flex justify-between items-center pt-1 border-t border-border">
            <span className="text-xl font-bold text-text">Total</span>
            <span className="text-3xl font-display font-bold text-text tabular-nums">
              {formatNZD(totalCents)}
            </span>
          </div>

          {/* Payment method badge */}
          <div className="flex justify-between items-center pt-1">
            <span className="text-sm text-text-muted">Payment</span>
            <span className="inline-flex items-center px-2 py-1 rounded text-sm font-bold bg-navy/10 text-navy">
              {paymentLabel(paymentMethod)}
            </span>
          </div>

          {/* Cash details */}
          {cashTenderedCents != null && cashTenderedCents > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-text-muted">Tendered</span>
              <span className="text-sm tabular-nums">{formatNZD(cashTenderedCents)}</span>
            </div>
          )}
          {changeDueCents != null && changeDueCents > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-text">Change</span>
              <span className="text-base font-bold text-success tabular-nums">
                {formatNZD(changeDueCents)}
              </span>
            </div>
          )}
        </div>

        {/* New sale button */}
        <div className="px-4 pb-6">
          <button
            onClick={onNewSale}
            className="w-full min-h-[56px] bg-amber text-white text-base font-bold rounded-lg hover:opacity-90 transition-opacity"
          >
            New Sale
          </button>
        </div>
      </div>
    </div>
  )
}
