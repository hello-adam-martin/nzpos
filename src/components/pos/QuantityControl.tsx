'use client'

import { Minus, Plus } from 'lucide-react'

type QuantityControlProps = {
  quantity: number
  onIncrement: () => void
  onDecrement: () => void
}

export function QuantityControl({ quantity, onIncrement, onDecrement }: QuantityControlProps) {
  return (
    <div className="flex items-center gap-1">
      {/* Minus / decrement button — padded to 44px touch target */}
      <button
        type="button"
        onClick={onDecrement}
        aria-label="Decrease quantity"
        className="flex items-center justify-center w-9 h-9 min-w-[36px] min-h-[36px] p-1 rounded border border-border bg-card text-text hover:bg-surface transition-colors"
      >
        <Minus className="w-4 h-4" aria-hidden="true" />
      </button>

      {/* Quantity display */}
      <span className="w-8 text-center text-base font-bold tabular-nums select-none">
        {quantity}
      </span>

      {/* Plus / increment button — padded to 44px touch target */}
      <button
        type="button"
        onClick={onIncrement}
        aria-label="Increase quantity"
        className="flex items-center justify-center w-9 h-9 min-w-[36px] min-h-[36px] p-1 rounded border border-border bg-card text-text hover:bg-surface transition-colors"
      >
        <Plus className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  )
}
